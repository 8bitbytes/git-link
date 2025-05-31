import * as assert from 'assert';
import * as vscode from 'vscode';
import { SettingsPanel } from '../../settings/settingsPanel';

suite('Settings Panel Tests', () => {
    // Store original VS Code API functions
    const originalCreateWebviewPanel = vscode.window.createWebviewPanel;
    let webviewPanel: any = null;
    let mockExtensionUri: vscode.Uri;
    
    setup(() => {
        // Create mock extension URI
        mockExtensionUri = vscode.Uri.file('/mock/extension');
        
        // Mock the createWebviewPanel function
        (vscode.window as any).createWebviewPanel = (_viewType: string, _title: string, _column: any, _options?: any) => {
            // Create a mock webview panel
            webviewPanel = {
                webview: {
                    html: '',
                    onDidReceiveMessage: () => ({ dispose: () => { /* Empty for test */ } }),
                    postMessage: () => true,
                    asWebviewUri: (uri: vscode.Uri) => uri,
                    cspSource: 'mock-csp-source'
                },
                onDidDispose: (callback: any) => {
                    webviewPanel.disposeCallback = callback;
                    return { dispose: () => { /* Empty for test */ } };
                },
                reveal: () => { /* Empty for test */ },
                dispose: () => {
                    if (webviewPanel.disposeCallback) {
                        webviewPanel.disposeCallback();
                    }
                    webviewPanel = null;
                }
            };
            
            return webviewPanel;
        };
        
        // Mock workspace configuration
        const config: Record<string, any> = {
            'useCustomUrl': false,
            'customUrl': '',
            'customDomains': [],
            'lastUsedDomain': ''
        };
        
        const originalGetConfig = vscode.workspace.getConfiguration;
        (vscode.workspace as any).getConfiguration = (section?: string) => {
            if (section === 'gitLink') {
                return {
                    get: (key: string) => config[key],
                    update: () => Promise.resolve(),
                    has: () => true,
                    inspect: () => undefined
                };
            }
            return originalGetConfig(section);
        };
    });
    
    teardown(() => {
        // Restore original VS Code functions
        (vscode.window as any).createWebviewPanel = originalCreateWebviewPanel;
        
        // Clean up any remaining panel
        if ((SettingsPanel as any).instance) {
            (SettingsPanel as any).instance.dispose();
        }
    });
    
    test('Should create a new panel when none exists', () => {
        // Ensure no panel exists initially
        assert.strictEqual((SettingsPanel as any).instance, undefined);
        
        // Create a panel
        SettingsPanel.createOrShow(mockExtensionUri);
        
        // Check that panel was created
        assert.notStrictEqual((SettingsPanel as any).instance, undefined);
        assert.strictEqual(webviewPanel !== null, true);
    });
    
    test('Should dispose existing panel when creating a new one', () => {
        // Create first panel
        SettingsPanel.createOrShow(mockExtensionUri);
        const firstPanel = (SettingsPanel as any).instance;
        
        // Create another panel
        SettingsPanel.createOrShow(mockExtensionUri);
        
        // Check that a new panel was created
        assert.notStrictEqual((SettingsPanel as any).instance, firstPanel);
    });
    
    test('Should clean up panel on disposal', () => {
        // Create a panel
        SettingsPanel.createOrShow(mockExtensionUri);
        const panel = (SettingsPanel as any).instance;
        
        // Dispose the panel
        if (panel && panel.dispose) {
            panel.dispose();
        }
        
        // Check that panel was cleaned up
        assert.strictEqual((SettingsPanel as any).instance, undefined);
        assert.strictEqual(webviewPanel, null);
    });
    
    test('Should handle disposal via webview panel', () => {
        // Create a panel
        SettingsPanel.createOrShow(mockExtensionUri);
        
        // Simulate webview panel being disposed
        webviewPanel.dispose();
        
        // Check that panel was cleaned up
        assert.strictEqual((SettingsPanel as any).instance, undefined);
    });
}); 