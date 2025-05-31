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
const gitLinkGenerator_1 = require("../../gitLinkGenerator");
const childProcess = __importStar(require("child_process"));
// This approach uses the fact that we can access the module's exports
// for testing purposes, without modifying read-only properties
// Mock command execution
function mockExec(mockResponses) {
    // Store the original exec function
    const originalExec = childProcess.exec;
    // Create a wrapper function to intercept exec calls
    const mockExecFn = function (command, options, callback) {
        // Find a matching mock response
        const responseKey = Object.keys(mockResponses).find(key => command.includes(key));
        if (responseKey && callback) {
            // Simulate async exec with the mock response
            setTimeout(() => {
                callback(null, mockResponses[responseKey], '');
            }, 0);
            return {};
        }
        // Fall back to actual exec for unmatched commands
        return originalExec(command, options, callback);
    };
    // Replace the exec function
    childProcess.exec = mockExecFn;
    // Return a cleanup function
    return () => {
        childProcess.exec = originalExec;
    };
}
// Mock VS Code workspace
function mockWorkspace(config) {
    // Store original configuration function
    const originalGetConfig = vscode.workspace.getConfiguration;
    const originalWorkspaceFolders = vscode.workspace.workspaceFolders;
    // Create mock configuration
    const mockConfig = {
        get: (key) => config[key],
        update: () => Promise.resolve(),
        has: () => true,
        inspect: () => undefined
    };
    // Override the getConfiguration function
    vscode.workspace.getConfiguration = (section) => {
        if (section === 'gitLink') {
            return mockConfig;
        }
        return originalGetConfig(section);
    };
    // Override workspace folders
    vscode.workspace.workspaceFolders = [{ uri: { fsPath: '/mock/workspace' } }];
    // Return a cleanup function
    return () => {
        vscode.workspace.getConfiguration = originalGetConfig;
        vscode.workspace.workspaceFolders = originalWorkspaceFolders;
    };
}
suite('Git Link Generator Tests', () => {
    let cleanupExec;
    let cleanupWorkspace;
    setup(() => {
        // Set up mocks with default values
        cleanupExec = mockExec({
            'rev-parse --abbrev-ref HEAD': 'main\n',
            'git config --get remote.origin.url': 'https://github.com/user/repo.git\n'
        });
        cleanupWorkspace = mockWorkspace({
            'useCustomUrl': false,
            'customUrl': '',
            'customDomains': [],
            'lastUsedDomain': ''
        });
    });
    teardown(() => {
        // Clean up mocks
        cleanupExec();
        cleanupWorkspace();
    });
    test('Should generate GitHub link with default settings', async () => {
        const link = await (0, gitLinkGenerator_1.generateGitLink)('/mock/workspace/src/file.ts', 10);
        assert.strictEqual(link, 'https://github.com/user/repo/blob/main/src/file.ts#L10');
    });
    test('Should generate GitHub link with line range', async () => {
        const link = await (0, gitLinkGenerator_1.generateGitLink)('/mock/workspace/src/file.ts', 10, 20);
        assert.strictEqual(link, 'https://github.com/user/repo/blob/main/src/file.ts#L10-L20');
    });
    test('Should handle custom domain without protocol', async () => {
        // Clean up previous mocks
        cleanupWorkspace();
        // Setup new configuration
        cleanupWorkspace = mockWorkspace({
            'useCustomUrl': true,
            'customUrl': 'github.custom.com',
            'customDomains': ['github.custom.com'],
            'lastUsedDomain': 'github.custom.com'
        });
        const link = await (0, gitLinkGenerator_1.generateGitLink)('/mock/workspace/src/file.ts', 10);
        assert.strictEqual(link, 'https://github.custom.com/user/repo/blob/main/src/file.ts#L10');
    });
    test('Should handle custom domain with protocol', async () => {
        // Clean up previous mocks
        cleanupWorkspace();
        // Setup new configuration
        cleanupWorkspace = mockWorkspace({
            'useCustomUrl': true,
            'customUrl': 'https://github.custom.com',
            'customDomains': ['https://github.custom.com'],
            'lastUsedDomain': 'https://github.custom.com'
        });
        const link = await (0, gitLinkGenerator_1.generateGitLink)('/mock/workspace/src/file.ts', 10);
        assert.strictEqual(link, 'https://github.custom.com/user/repo/blob/main/src/file.ts#L10');
    });
    test('Should handle custom domain with path', async () => {
        // Clean up previous mocks
        cleanupWorkspace();
        // Setup new configuration
        cleanupWorkspace = mockWorkspace({
            'useCustomUrl': true,
            'customUrl': 'github.custom.com/custom-path',
            'customDomains': ['github.custom.com/custom-path'],
            'lastUsedDomain': 'github.custom.com/custom-path'
        });
        const link = await (0, gitLinkGenerator_1.generateGitLink)('/mock/workspace/src/file.ts', 10);
        assert.strictEqual(link, 'https://github.custom.com/custom-path/blob/main/src/file.ts#L10');
    });
    test('Should handle SSH remote URLs', async () => {
        // Clean up previous mocks
        cleanupExec();
        // Setup new git responses
        cleanupExec = mockExec({
            'rev-parse --abbrev-ref HEAD': 'main\n',
            'git config --get remote.origin.url': 'git@github.com:user/repo.git\n'
        });
        const link = await (0, gitLinkGenerator_1.generateGitLink)('/mock/workspace/src/file.ts', 10);
        assert.strictEqual(link, 'https://github.com/user/repo/blob/main/src/file.ts#L10');
    });
    test('Should handle GitLab URLs', async () => {
        // Clean up previous mocks
        cleanupExec();
        // Setup new git responses
        cleanupExec = mockExec({
            'rev-parse --abbrev-ref HEAD': 'main\n',
            'git config --get remote.origin.url': 'https://gitlab.com/user/repo.git\n'
        });
        const link = await (0, gitLinkGenerator_1.generateGitLink)('/mock/workspace/src/file.ts', 10);
        assert.strictEqual(link, 'https://gitlab.com/user/repo/-/blob/main/src/file.ts#L10');
    });
    test('Should handle Bitbucket URLs', async () => {
        // Clean up previous mocks
        cleanupExec();
        // Setup new git responses
        cleanupExec = mockExec({
            'rev-parse --abbrev-ref HEAD': 'main\n',
            'git config --get remote.origin.url': 'https://bitbucket.org/user/repo.git\n'
        });
        const link = await (0, gitLinkGenerator_1.generateGitLink)('/mock/workspace/src/file.ts', 10);
        assert.strictEqual(link, 'https://bitbucket.org/user/repo/src/main/src/file.ts#lines-10');
    });
    test('Should handle Azure DevOps URLs', async () => {
        // Clean up previous mocks
        cleanupExec();
        // Setup new git responses
        cleanupExec = mockExec({
            'rev-parse --abbrev-ref HEAD': 'main\n',
            'git config --get remote.origin.url': 'https://dev.azure.com/org/project/_git/repo\n'
        });
        const link = await (0, gitLinkGenerator_1.generateGitLink)('/mock/workspace/src/file.ts', 10);
        assert.strictEqual(link, 'https://dev.azure.com/org/project/_git/repo?path=src%2Ffile.ts&version=GBmain&line=10');
    });
    test('Should use fallback for unknown git hosts', async () => {
        // Clean up previous mocks
        cleanupExec();
        // Setup new git responses
        cleanupExec = mockExec({
            'rev-parse --abbrev-ref HEAD': 'main\n',
            'git config --get remote.origin.url': 'https://unknown-host.com/user/repo.git\n'
        });
        const link = await (0, gitLinkGenerator_1.generateGitLink)('/mock/workspace/src/file.ts', 10);
        assert.strictEqual(link, 'https://unknown-host.com/user/repo/blob/main/src/file.ts#L10');
    });
});
//# sourceMappingURL=gitLinkGenerator.test.js.map