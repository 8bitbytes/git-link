"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsPanel = void 0;
const vscode = __importStar(require("vscode"));
const settingsWebview_1 = require("./settingsWebview");
class SettingsPanel {
    static currentPanel;
    _panel;
    _extensionUri;
    _currentSettings = null;
    _isDisposing = false;
    _webviewActive = true;
    _saveTimeout = null;
    _disposables = [];
    static createOrShow(extensionUri) {
        // If we already have a panel, dispose it first to avoid any disposed webview issues
        if (SettingsPanel.currentPanel) {
            try {
                SettingsPanel.currentPanel.dispose();
            }
            catch (e) {
                console.error('Error disposing existing panel:', e);
            }
            SettingsPanel.currentPanel = undefined;
        }
        // Create a fresh panel
        try {
            const panel = vscode.window.createWebviewPanel('gitLinkSettings', 'Git Link Settings', vscode.ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
                retainContextWhenHidden: true
            });
            SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri);
        }
        catch (e) {
            console.error('Error creating settings panel:', e);
            vscode.window.showErrorMessage(`Failed to open settings: ${e}`);
        }
    }
    constructor(panel, extensionUri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._isDisposing = false;
        this._webviewActive = true;
        // Get initial settings from VS Code
        const config = vscode.workspace.getConfiguration('gitLink');
        this._currentSettings = {
            useCustomUrl: Boolean(config.get('useCustomUrl')),
            customUrl: String(config.get('customUrl') || ''),
            customDomains: config.get('customDomains') || [],
            lastUsedDomain: String(config.get('lastUsedDomain') || '')
        };
        // Set the webview's initial html content
        this._initializeWebview();
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            if (this._isDisposing)
                return;
            await this._handleWebviewMessage(message);
        }, null, this._disposables);
        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => {
            if (!this._isDisposing) {
                this._isDisposing = true;
                this._webviewActive = false;
                this._cleanup();
            }
        }, null, this._disposables);
    }
    async _initializeWebview() {
        try {
            // Get current settings
            const config = vscode.workspace.getConfiguration('gitLink');
            const useCustomUrl = Boolean(config.get('useCustomUrl'));
            const customUrl = String(config.get('customUrl') || '');
            const customDomains = config.get('customDomains') || [];
            const lastUsedDomain = String(config.get('lastUsedDomain') || '');
            // Set the webview's HTML content
            this._panel.webview.html = (0, settingsWebview_1.getSettingsWebviewContent)(this._panel.webview, {
                useCustomUrl,
                customUrl,
                customDomains,
                lastUsedDomain
            }, this._extensionUri, true // Enable auto-save mode
            );
            // Send initial settings to the webview
            this._safePostMessage({
                command: 'setSettings',
                useCustomUrl,
                customUrl,
                customDomains,
                lastUsedDomain,
                autoSaveEnabled: true
            });
        }
        catch (e) {
            console.error('Error initializing webview:', e);
            this._webviewActive = false;
        }
    }
    async _handleWebviewMessage(message) {
        try {
            switch (message.command) {
                case 'saveSettings':
                    // Legacy save command - should rarely be used now
                    await this._saveSettings(message);
                    break;
                case 'settingsChanged':
                    // Auto-save when settings change (with debounce)
                    this._currentSettings = message;
                    this._debouncedSaveSettings();
                    break;
                case 'cancel':
                    this._isDisposing = true;
                    this._webviewActive = false;
                    this.dispose();
                    break;
                case 'currentSettings':
                    // Store the current settings
                    this._currentSettings = message;
                    break;
            }
        }
        catch (e) {
            console.error('Error handling webview message:', e);
        }
    }
    _debouncedSaveSettings() {
        // Clear any existing timeout
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        // Set a new timeout to save settings after 500ms of inactivity
        this._saveTimeout = setTimeout(() => {
            if (this._currentSettings && !this._isDisposing) {
                this._saveSettings(this._currentSettings).catch(e => {
                    console.error('Error in debounced save:', e);
                });
            }
            this._saveTimeout = null;
        }, 500);
    }
    // Safely post a message to the webview, handling the case where it might be disposed
    _safePostMessage(message) {
        if (this._isDisposing || !this._webviewActive || !this._panel) {
            return false;
        }
        try {
            this._panel.webview.postMessage(message);
            return true;
        }
        catch (e) {
            // Webview was likely disposed
            this._webviewActive = false;
            console.log('Error posting message to webview:', e);
            return false;
        }
    }
    async _saveSettings(message) {
        if (this._isDisposing)
            return;
        try {
            const config = vscode.workspace.getConfiguration('gitLink');
            // Save custom URL settings
            await config.update('useCustomUrl', Boolean(message.useCustomUrl), vscode.ConfigurationTarget.Global);
            await config.update('customUrl', String(message.customUrl || ''), vscode.ConfigurationTarget.Global);
            await config.update('customDomains', message.customDomains || [], vscode.ConfigurationTarget.Global);
            await config.update('lastUsedDomain', String(message.lastUsedDomain || ''), vscode.ConfigurationTarget.Global);
            // Send confirmation to webview that settings were saved
            this._safePostMessage({ command: 'settingsSaved' });
        }
        catch (error) {
            console.error('Failed to save settings:', error);
            if (!this._isDisposing) {
                vscode.window.showErrorMessage(`Failed to save settings: ${error}`);
            }
        }
    }
    // Public method to properly dispose the panel
    dispose() {
        try {
            // Mark as disposing to prevent further operations
            this._isDisposing = true;
            this._webviewActive = false;
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
                    }
                    catch (e) {
                        console.error('Error disposing resource:', e);
                    }
                }
            }
            // Clear the current panel reference
            SettingsPanel.currentPanel = undefined;
        }
        catch (e) {
            console.error('Error during panel disposal:', e);
            // Ensure the current panel is cleared even if there was an error
            SettingsPanel.currentPanel = undefined;
        }
    }
    _saveFinalSettings() {
        if (!this._currentSettings)
            return;
        try {
            // Use a synchronous approach for the final save to ensure it completes
            const config = vscode.workspace.getConfiguration('gitLink');
            config.update('useCustomUrl', Boolean(this._currentSettings.useCustomUrl), vscode.ConfigurationTarget.Global);
            config.update('customUrl', String(this._currentSettings.customUrl || ''), vscode.ConfigurationTarget.Global);
            config.update('customDomains', this._currentSettings.customDomains || [], vscode.ConfigurationTarget.Global);
            config.update('lastUsedDomain', String(this._currentSettings.lastUsedDomain || ''), vscode.ConfigurationTarget.Global);
        }
        catch (e) {
            console.error('Error during final settings save:', e);
        }
    }
    _cleanup() {
        this.dispose();
    }
}
exports.SettingsPanel = SettingsPanel;
//# sourceMappingURL=settingsPanel.js.map