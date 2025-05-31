# Git Link

A VS Code extension that allows you to create links to Git repositories with customizable domain options. Easily share links to files or specific code selections with your team.

## Features

- **Copy Link to Selection**: Generate a link to the currently selected code in your repository
- **Copy Link to File**: Generate a link to the entire file
- **Custom Domain Support**: Replace the default Git remote URL with custom domains
- **Support for Multiple Git Hosting Services**: Works with GitHub, GitLab, Bitbucket, Azure DevOps, and more
- **Context Menu Integration**: Right-click in the editor or file explorer to access Git Link commands

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Git Link"
4. Click Install

## Usage

### Copying a link to selected code
1. Select code in the editor
2. Right-click and select "Copy Git Link to Selection"
3. The link is copied to your clipboard

### Copying a link to a file
1. Right-click on a file in the explorer or editor tab
2. Select "Copy Git Link to File"
3. The link is copied to your clipboard

### Using custom domains
1. Open the command palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run "Open Git Link Settings"
3. Enable "Always use custom domain"
4. Add one or more custom domains
5. Select the domain you want to use

## Extension Settings

This extension contributes the following settings:

* `gitLink.useCustomUrl`: Enable/disable using a custom URL instead of the Git remote URL
* `gitLink.customUrl`: The currently selected custom URL
* `gitLink.customDomains`: List of custom domains that can be selected
* `gitLink.lastUsedDomain`: The last used custom domain

## Supported Git Hosting Services

The extension automatically detects and formats links for:
- GitHub
- GitLab
- Bitbucket
- Azure DevOps

For other Git hosting services, a generic link format is used.

## Requirements

- Git must be installed and available in your PATH
- The repository must have a remote URL configured

## License

MIT

---

**Enjoy!**
