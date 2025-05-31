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
suite('Extension Test Suite', () => {
    test('Extension is activated', async () => {
        // Get the list of activated extensions
        const extensions = vscode.extensions.all;
        // Find our extension (may have different publisher in dev mode)
        const gitLinkExtension = extensions.find(ext => ext.id.toLowerCase().includes('git-link') ||
            ext.id.toLowerCase().includes('gitlink'));
        // Check that our extension is activated
        assert.notStrictEqual(gitLinkExtension, undefined, 'Git Link extension not found');
    });
    test('Commands are registered', async () => {
        // Get all available commands
        const commands = await vscode.commands.getCommands();
        // Check that our commands are registered
        assert.ok(commands.includes('git-link.copyGitLink'), 'copyGitLink command not registered');
        assert.ok(commands.includes('git-link.copyFileGitLink'), 'copyFileGitLink command not registered');
        assert.ok(commands.includes('git-link.openSettings'), 'openSettings command not registered');
    });
});
//# sourceMappingURL=extension.test.js.map