import * as vscode from 'vscode';
import { getSettingsWebviewContent } from './settingsWebview';

export class SettingsPanel {
    private static instance: SettingsPanel | undefined;
    
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _currentSettings: any = null;
    private _isDisposed = false;
    private _isVisible = false;
    private _saveTimeout: NodeJS.Timeout | null = null;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri): void {
        // If we already have a panel, dispose it first to avoid any disposed webview issues
        if (SettingsPanel.instance) {
            try {
                SettingsPanel.instance.dispose();
            } catch (e) {
                console.error('Error disposing existing panel:', e);
            }
            SettingsPanel.instance = undefined;
        }

        // Create a new panel 
        try {
            // Create a new instance
            SettingsPanel.instance = new SettingsPanel(extensionUri);
        } catch (e) {
            console.error('Error creating settings panel:', e);
        }
    }

    private constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
        
        // Create webview panel
        this._panel = vscode.window.createWebviewPanel(
            'repoAnchorSettings',
            'Repo Anchor Settings',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
                retainContextWhenHidden: true
            }
        );
        
        // Get initial settings from VS Code
        const config = vscode.workspace.getConfiguration('gitLink');
        this._currentSettings = {
            useCustomUrl: Boolean(config.get('useCustomUrl')),
            customUrl: String(config.get('customUrl') || ''),
            customDomains: config.get('customDomains') as string[] || [],
            lastUsedDomain: String(config.get('lastUsedDomain') || '')
        };

        // Set the webview's initial html content
        this._initializeWebview();

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                if (this._isDisposed) return;
                await this._handleWebviewMessage(message);
            },
            null,
            this._disposables
        );

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => {
            if (!this._isDisposed) {
                this._isDisposed = true;
                this._isVisible = false;
                this._cleanup();
            }
        }, null, this._disposables);
    }

    private async _initializeWebview() {
        try {
            // Get current settings
            const config = vscode.workspace.getConfiguration('gitLink');
            const useCustomUrl = Boolean(config.get('useCustomUrl'));
            const customUrl = String(config.get('customUrl') || '');
            const customDomains = config.get('customDomains') as string[] || [];
            const lastUsedDomain = String(config.get('lastUsedDomain') || '');

            // Set the webview's HTML content
            this._panel.webview.html = getSettingsWebviewContent(
                this._panel.webview,
                this._extensionUri,
                {
                    useCustomUrl,
                    customUrl,
                    customDomains,
                    lastUsedDomain
                }
            );

            // Send initial settings to the webview
            this._safePostMessage({
                command: 'setSettings',
                useCustomUrl,
                customUrl,
                customDomains,
                lastUsedDomain
            });
        } catch (e) {
            console.error('Error initializing webview:', e);
            this._isVisible = false;
        }
    }

    private async _handleWebviewMessage(message: any) {
        try {
            switch (message.command) {
                case 'settingsChanged':
                    // Auto-save when settings change (with debounce)
                    this._currentSettings = message;
                    this._debouncedSaveSettings();
                    break;
                    
                case 'cancel':
                    this._isDisposed = true;
                    this._isVisible = false;
                    this.dispose();
                    break;
                    
                case 'currentSettings':
                    // Store the current settings
                    this._currentSettings = message;
                    break;
            }
        } catch (e) {
            console.error('Error handling webview message:', e);
        }
    }

    private _debouncedSaveSettings() {
        // Clear any existing timeout
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        
        // Set a new timeout to save settings after 500ms of inactivity
        this._saveTimeout = setTimeout(() => {
            if (this._currentSettings && !this._isDisposed) {
                this._saveSettings(this._currentSettings).catch(e => {
                    console.error('Error in debounced save:', e);
                });
            }
            this._saveTimeout = null;
        }, 500);
    }

    // Safely post a message to the webview, handling the case where it might be disposed
    private _safePostMessage(message: any): boolean {
        if (this._isDisposed || !this._isVisible || !this._panel) {
            return false;
        }
        
        try {
            this._panel.webview.postMessage(message);
            return true;
        } catch (e) {
            // Webview was likely disposed
            this._isVisible = false;
            console.log('Error posting message to webview:', e);
            return false;
        }
    }

    private async _saveSettings(message: any) {
        if (this._isDisposed) return;
        
        try {
            const config = vscode.workspace.getConfiguration('gitLink');
            
            // Save custom URL settings
            await config.update('useCustomUrl', Boolean(message.useCustomUrl), vscode.ConfigurationTarget.Global);
            await config.update('customUrl', String(message.customUrl || ''), vscode.ConfigurationTarget.Global);
            await config.update('customDomains', message.customDomains || [], vscode.ConfigurationTarget.Global);
            await config.update('lastUsedDomain', String(message.lastUsedDomain || ''), vscode.ConfigurationTarget.Global);
            
            // Send confirmation to webview that settings were saved
            this._safePostMessage({ command: 'settingsSaved' });
        } catch (error) {
            console.error('Failed to save settings:', error);
            if (!this._isDisposed) {
                vscode.window.showErrorMessage(`Failed to save settings: ${error}`);
            }
        }
    }

    // Public method to properly dispose the panel
    public dispose() {
        try {
            // Mark as disposing to prevent further operations
            this._isDisposed = true;
            this._isVisible = false;
            
            // Process any pending saves
            this._saveFinalSettings();
            
            // Clean up timeouts
            if (this._saveTimeout) {
                clearTimeout(this._saveTimeout);
                this._saveTimeout = null;
            }
            
            // Dispose the panel if it exists
            if (this._panel) {
                this._panel.dispose();
            }
            
            // Clean up all disposables
            while (this._disposables.length) {
                const disposable = this._disposables.pop();
                if (disposable) {
                    try {
                        disposable.dispose();
                    } catch (e) {
                        console.error('Error disposing resource:', e);
                    }
                }
            }
            
            // Clear the current panel reference
            SettingsPanel.instance = undefined;
        } catch (e) {
            console.error('Error during panel disposal:', e);
            // Ensure the current panel is cleared even if there was an error
            SettingsPanel.instance = undefined;
        }
    }

    private _saveFinalSettings() {
        if (!this._currentSettings) return;
        
        try {
            // Use a synchronous approach for the final save to ensure it completes
            const config = vscode.workspace.getConfiguration('gitLink');
            config.update('useCustomUrl', Boolean(this._currentSettings.useCustomUrl), vscode.ConfigurationTarget.Global);
            config.update('customUrl', String(this._currentSettings.customUrl || ''), vscode.ConfigurationTarget.Global);
            config.update('customDomains', this._currentSettings.customDomains || [], vscode.ConfigurationTarget.Global);
            config.update('lastUsedDomain', String(this._currentSettings.lastUsedDomain || ''), vscode.ConfigurationTarget.Global);
        } catch (e) {
            console.error('Error during final settings save:', e);
        }
    }

    private _cleanup() {
        this.dispose();
    }
} 