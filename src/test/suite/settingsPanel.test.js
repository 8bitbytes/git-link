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
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const settingsPanel_1 = require("../../settings/settingsPanel");
suite('Settings Panel Tests', () => {
    // Store original VS Code API functions
    const originalCreateWebviewPanel = vscode.window.createWebviewPanel;
    let webviewPanel = null;
    let mockExtensionUri;
    setup(() => {
        // Create mock extension URI
        mockExtensionUri = vscode.Uri.file('/mock/extension');
        // Mock the createWebviewPanel function
        vscode.window.createWebviewPanel = (viewType, title, column, options) => {
            // Create a mock webview panel
            webviewPanel = {
                webview: {
                    html: '',
                    onDidReceiveMessage: () => ({ dispose: () => { } }),
                    postMessage: () => true,
                    asWebviewUri: (uri) => uri,
                    cspSource: 'mock-csp-source'
                },
                onDidDispose: (callback) => {
                    webviewPanel.disposeCallback = callback;
                    return { dispose: () => { } };
                },
                reveal: () => { },
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
        const config = {
            'useCustomUrl': false,
            'customUrl': '',
            'customDomains': [],
            'lastUsedDomain': ''
        };
        const originalGetConfig = vscode.workspace.getConfiguration;
        vscode.workspace.getConfiguration = (section) => {
            if (section === 'gitLink') {
                return {
                    get: (key) => config[key],
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
        vscode.window.createWebviewPanel = originalCreateWebviewPanel;
        // Clean up any remaining panel
        if (settingsPanel_1.SettingsPanel.currentPanel) {
            settingsPanel_1.SettingsPanel.currentPanel.dispose();
        }
    });
    test('Should create a new panel when none exists', () => {
        // Ensure no panel exists initially
        assert.strictEqual(settingsPanel_1.SettingsPanel.currentPanel, undefined);
        // Create a panel
        settingsPanel_1.SettingsPanel.createOrShow(mockExtensionUri);
        // Check that panel was created
        assert.notStrictEqual(settingsPanel_1.SettingsPanel.currentPanel, undefined);
        assert.strictEqual(webviewPanel !== null, true);
    });
    test('Should dispose existing panel when creating a new one', () => {
        // Create first panel
        settingsPanel_1.SettingsPanel.createOrShow(mockExtensionUri);
        const firstPanel = settingsPanel_1.SettingsPanel.currentPanel;
        // Create another panel
        settingsPanel_1.SettingsPanel.createOrShow(mockExtensionUri);
        // Check that a new panel was created
        assert.notStrictEqual(settingsPanel_1.SettingsPanel.currentPanel, firstPanel);
    });
    test('Should clean up panel on disposal', () => {
        // Create a panel
        settingsPanel_1.SettingsPanel.createOrShow(mockExtensionUri);
        const panel = settingsPanel_1.SettingsPanel.currentPanel;
        // Dispose the panel
        panel.dispose();
        // Check that panel was cleaned up
        assert.strictEqual(settingsPanel_1.SettingsPanel.currentPanel, undefined);
        assert.strictEqual(webviewPanel, null);
    });
    test('Should handle disposal via webview panel', () => {
        // Create a panel
        settingsPanel_1.SettingsPanel.createOrShow(mockExtensionUri);
        // Simulate webview panel being disposed
        webviewPanel.dispose();
        // Check that panel was cleaned up
        assert.strictEqual(settingsPanel_1.SettingsPanel.currentPanel, undefined);
    });
});
//# sourceMappingURL=settingsPanel.test.js.map