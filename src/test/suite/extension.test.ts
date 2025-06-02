import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { Uri } from 'vscode';
import * as gitLinkGeneratorModule from '../../gitLinkGenerator';

suite('Extension Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let generateGitLinkStub: sinon.SinonStub;
    let disposables: vscode.Disposable[] = [];
    
    // Use unique command IDs for tests
    const TEST_EDITOR_COMMAND = 'repoanchor.test.openRepoLinkFromEditor';
    const TEST_TAB_COMMAND = 'repoanchor.test.openRepoLinkFromTab';
    
    setup(async () => {
        sandbox = sinon.createSandbox();
        generateGitLinkStub = sandbox.stub(gitLinkGeneratorModule, 'generateGitLink');
        
        // Register test commands with unique IDs
        disposables.push(
            vscode.commands.registerCommand(TEST_EDITOR_COMMAND, async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor');
                    return;
                }

                const filePath = editor.document.uri.fsPath;
                const selection = editor.selection;
                
                let startLine: number;
                let endLine: number | undefined;
                
                if (!selection.isEmpty) {
                    startLine = selection.start.line + 1;
                    endLine = selection.end.line + 1;
                } else {
                    startLine = selection.active.line + 1;
                }

                const gitUrl = await generateGitLinkStub(filePath, startLine, endLine);
                await vscode.env.openExternal(Uri.parse(gitUrl));
                vscode.window.showInformationMessage(`Opening repository link in browser...`);
            }),
            
            vscode.commands.registerCommand(TEST_TAB_COMMAND, async (uri?: Uri) => {
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

                const gitUrl = await generateGitLinkStub(filePath, 1);
                await vscode.env.openExternal(Uri.parse(gitUrl));
                vscode.window.showInformationMessage(`Opening repository link in browser...`);
            })
        );
    });
    
    teardown(() => {
        sandbox.restore();
        disposables.forEach(d => d.dispose());
        disposables = [];
    });

    test('Extension can register test commands', async () => {
        // Verify that our test commands are registered
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes(TEST_EDITOR_COMMAND));
        assert.ok(commands.includes(TEST_TAB_COMMAND));
    });

    suite('openRepoLinkFromEditor Command', () => {
        test('handles text selection', async () => {
            // Mock the necessary VS Code APIs
            const mockEditor = {
                document: {
                    uri: Uri.file('/test/file.ts'),
                    fsPath: '/test/file.ts'
                },
                selection: {
                    isEmpty: false,
                    start: { line: 9 },  // 0-based
                    end: { line: 11 }    // 0-based
                }
            };

            // Mock the activeTextEditor
            sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            
            // Setup generateGitLink mock
            const expectedUrl = 'https://github.com/test/repo/blob/main/file.ts#L10-L12';
            generateGitLinkStub.withArgs('/test/file.ts', 10, 12).resolves(expectedUrl);
            
            // Mock openExternal
            const openExternalStub = sandbox.stub(vscode.env, 'openExternal').resolves(true);
            
            // Execute command
            await vscode.commands.executeCommand(TEST_EDITOR_COMMAND);
            
            // Verify generateGitLink was called with correct parameters
            sinon.assert.calledWith(generateGitLinkStub, '/test/file.ts', 10, 12);
            
            // Verify browser was opened with correct URL
            sinon.assert.calledWith(openExternalStub, Uri.parse(expectedUrl));
        });

        test('handles single line cursor position', async () => {
            const mockEditor = {
                document: {
                    uri: Uri.file('/test/file.ts'),
                    fsPath: '/test/file.ts'
                },
                selection: {
                    isEmpty: true,
                    active: { line: 4 }  // 0-based
                }
            };

            sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            
            const expectedUrl = 'https://github.com/test/repo/blob/main/file.ts#L5';
            generateGitLinkStub.withArgs('/test/file.ts', 5).resolves(expectedUrl);
            
            const openExternalStub = sandbox.stub(vscode.env, 'openExternal').resolves(true);
            
            await vscode.commands.executeCommand(TEST_EDITOR_COMMAND);
            
            sinon.assert.calledWith(generateGitLinkStub, '/test/file.ts', 5);
            sinon.assert.calledWith(openExternalStub, Uri.parse(expectedUrl));
        });

        test('handles no active editor', async () => {
            sandbox.stub(vscode.window, 'activeTextEditor').value(undefined);
            
            const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
            
            await vscode.commands.executeCommand(TEST_EDITOR_COMMAND);
            
            sinon.assert.calledWith(showErrorMessageStub, 'No active editor');
        });
    });

    suite('openRepoLinkFromTab Command', () => {
        test('handles uri from file explorer', async () => {
            const uri = Uri.file('/test/explorer-file.ts');
            
            const expectedUrl = 'https://github.com/test/repo/blob/main/explorer-file.ts';
            generateGitLinkStub.withArgs('/test/explorer-file.ts', 1).resolves(expectedUrl);
            
            const openExternalStub = sandbox.stub(vscode.env, 'openExternal').resolves(true);
            
            await vscode.commands.executeCommand(TEST_TAB_COMMAND, uri);
            
            sinon.assert.calledWith(generateGitLinkStub, '/test/explorer-file.ts', 1);
            sinon.assert.calledWith(openExternalStub, Uri.parse(expectedUrl));
        });

        test('falls back to active editor when no uri provided', async () => {
            const mockEditor = {
                document: {
                    uri: Uri.file('/test/active-file.ts'),
                    fsPath: '/test/active-file.ts'
                }
            };

            sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            
            const expectedUrl = 'https://github.com/test/repo/blob/main/active-file.ts';
            generateGitLinkStub.withArgs('/test/active-file.ts', 1).resolves(expectedUrl);
            
            const openExternalStub = sandbox.stub(vscode.env, 'openExternal').resolves(true);
            
            await vscode.commands.executeCommand(TEST_TAB_COMMAND);
            
            sinon.assert.calledWith(generateGitLinkStub, '/test/active-file.ts', 1);
            sinon.assert.calledWith(openExternalStub, Uri.parse(expectedUrl));
        });

        test('handles no uri and no active editor', async () => {
            sandbox.stub(vscode.window, 'activeTextEditor').value(undefined);
            
            const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
            
            await vscode.commands.executeCommand(TEST_TAB_COMMAND);
            
            sinon.assert.calledWith(showErrorMessageStub, 'No file selected');
        });
    });
}); 