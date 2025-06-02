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
            vscode.window.showErrorMessage(`Failed to open Repo Anchor settings: ${error}`);
        }
    });

    // Command to copy repo link from editor
    const editorCommand = vscode.commands.registerCommand('repoanchor.copyRepoLink', async () => {
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
            vscode.window.showInformationMessage(`Repo link copied to clipboard!`);
        } catch (error) {
            vscode.window.showErrorMessage(`${error}`);
        }
    });

    // Command to copy repo link from tab/explorer
    const fileCommand = vscode.commands.registerCommand('repoanchor.copyFileRepoLink', async (uri?: vscode.Uri) => {
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
            vscode.window.showInformationMessage(`Repo link to file copied to clipboard!`);
        } catch (error) {
            vscode.window.showErrorMessage(`${error}`);
        }
    });

    // Command to open repo link from editor (with selection support)
    const openLinkFromEditorCommand = vscode.commands.registerCommand('repoanchor.openRepoLinkFromEditor', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }

            const filePath = editor.document.uri.fsPath;
            const selection = editor.selection;
            
            // Check if there's an actual selection
            let startLine: number;
            let endLine: number | undefined;
            
            if (!selection.isEmpty) {
                startLine = selection.start.line + 1;
                endLine = selection.end.line + 1;
            } else {
                // No selection, use current line
                startLine = selection.active.line + 1;
            }

            console.log('filePath', filePath);
            console.log('startLine', startLine);
            console.log('endLine', endLine);
            const gitUrl = await generateGitLink(filePath, startLine, endLine);
            
            // Open in browser
            vscode.env.openExternal(vscode.Uri.parse(gitUrl));
            vscode.window.showInformationMessage(`Opening repository link in browser...`);
        } catch (error) {
            vscode.window.showErrorMessage(`${error}`);
        }
    });

    // Command to open repo link from tab/explorer (whole file)
    const openLinkFromTabCommand = vscode.commands.registerCommand('repoanchor.openRepoLinkFromTab', async (uri?: vscode.Uri) => {
        try {
            let filePath: string;
            
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

            console.log('filePath', filePath);
            const gitUrl = await generateGitLink(filePath, 1); // Always link to whole file
            
            // Open in browser
            vscode.env.openExternal(vscode.Uri.parse(gitUrl));
            vscode.window.showInformationMessage(`Opening repository link in browser...`);
        } catch (error) {
            vscode.window.showErrorMessage(`${error}`);
        }
    });

    context.subscriptions.push(
        editorCommand, 
        fileCommand, 
        openLinkFromEditorCommand, 
        openLinkFromTabCommand, 
        settingsCommand
    );

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