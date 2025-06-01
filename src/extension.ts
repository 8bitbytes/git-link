import * as vscode from 'vscode';
import { SettingsPanel } from './settings/settingsPanel';
import { generateGitLink } from './gitLinkGenerator';

export function activate(context: vscode.ExtensionContext) {
    // Command to open settings UI with error handling
    const settingsCommand = vscode.commands.registerCommand('repoanchor.openSettings', () => {
        try {
            SettingsPanel.createOrShow(context.extensionUri);
        } catch (error) {
            console.error('Error opening settings:', error);
            vscode.window.showErrorMessage(`Failed to open Git Link settings: ${error}`);
        }
    });

    // Command to copy git link from editor
    const editorCommand = vscode.commands.registerCommand('repoanchor.copyGitLink', async () => {
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

            const gitUrl = await generateGitLink(filePath, startLine, endLine);
            
            // Copy to clipboard
            await vscode.env.clipboard.writeText(gitUrl);
            vscode.window.showInformationMessage(`Git link copied to clipboard!`);
        } catch (error) {
            vscode.window.showErrorMessage(`${error}`);
        }
    });

    // Command to copy git link from tab/explorer
    const fileCommand = vscode.commands.registerCommand('repoanchor.copyFileGitLink', async (uri?: vscode.Uri) => {
        try {
            // Use provided uri or active editor
            let filePath;
            if (uri) {
                filePath = uri.fsPath;
            } else {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No file selected');
                    return;
                }
                filePath = editor.document.uri.fsPath;
            }

            const gitUrl = await generateGitLink(filePath, 1); // Default to line 1
            
            // Copy to clipboard
            await vscode.env.clipboard.writeText(gitUrl);
            vscode.window.showInformationMessage(`Git link to file copied to clipboard!`);
        } catch (error) {
            vscode.window.showErrorMessage(`${error}`);
        }
    });

    context.subscriptions.push(editorCommand, fileCommand, settingsCommand);

    // If the settings panel is already visible, show it instead of creating a new one
    if ((SettingsPanel as any).instance) {
        try {
            (SettingsPanel as any).instance.dispose();
        } catch (error) {
            console.error('Error disposing settings panel:', error);
        }
    }
}

export function deactivate() {
    // Make sure to dispose the settings panel if it exists
    if ((SettingsPanel as any).instance) {
        try {
            (SettingsPanel as any).instance.dispose();
        } catch (e) {
            console.error('Error disposing settings panel during deactivate:', e);
        }
    }
}