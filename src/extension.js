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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const settingsPanel_1 = require("./settings/settingsPanel");
const gitLinkGenerator_1 = require("./gitLinkGenerator");
function activate(context) {
    // Command to open settings UI with error handling
    const settingsCommand = vscode.commands.registerCommand('git-link.openSettings', () => {
        try {
            settingsPanel_1.SettingsPanel.createOrShow(context.extensionUri);
        }
        catch (e) {
            console.error('Error opening settings:', e);
            vscode.window.showErrorMessage(`Failed to open Git Link settings: ${e}`);
        }
    });
    // Command to copy git link from editor
    let editorCommand = vscode.commands.registerCommand('git-link.copyGitLink', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }
            const filePath = editor.document.uri.fsPath;
            const selection = editor.selection;
            const startLine = selection.start.line + 1; // +1 because VSCode is 0-based
            // If there's a selection range, include the end line
            const endLine = selection.end.line !== selection.start.line ? selection.end.line + 1 : undefined;
            const gitUrl = await (0, gitLinkGenerator_1.generateGitLink)(filePath, startLine, endLine);
            // Copy to clipboard
            await vscode.env.clipboard.writeText(gitUrl);
            vscode.window.showInformationMessage(`Git link copied to clipboard!`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`${error}`);
        }
    });
    // Command to copy git link from tab/explorer
    let fileCommand = vscode.commands.registerCommand('git-link.copyFileGitLink', async (uri) => {
        try {
            // Use provided uri or active editor
            let filePath;
            if (uri) {
                filePath = uri.fsPath;
            }
            else {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No file selected');
                    return;
                }
                filePath = editor.document.uri.fsPath;
            }
            const gitUrl = await (0, gitLinkGenerator_1.generateGitLink)(filePath, 1); // Default to line 1
            // Copy to clipboard
            await vscode.env.clipboard.writeText(gitUrl);
            vscode.window.showInformationMessage(`Git link to file copied to clipboard!`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`${error}`);
        }
    });
    context.subscriptions.push(editorCommand, fileCommand, settingsCommand);
}
exports.activate = activate;
function deactivate() {
    // Make sure to dispose the settings panel if it exists
    if (settingsPanel_1.SettingsPanel.currentPanel) {
        try {
            settingsPanel_1.SettingsPanel.currentPanel.dispose();
        }
        catch (e) {
            console.error('Error disposing settings panel during deactivate:', e);
        }
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map