# Repo Anchor

A VS Code extension that allows you to create links to repository files and code with customizable domain options. Easily share links to files or specific code selections with your team.

## Features

- **Copy Link to Selection**: Generate a link to the currently selected code in your repository
- **Copy Link to File**: Generate a link to the entire file
- **Custom Domain Support**: Replace the default remote URL with custom domains
- **Support for Multiple Hosting Services**: Works with GitHub, GitLab, Bitbucket, Azure DevOps, and more
- **Context Menu Integration**: Right-click in the editor or file explorer to access Repo Anchor commands

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Repo Anchor"
4. Click Install

## Usage

### Copying a link to selected code
1. Select code in the editor
2. Right-click and select "Copy Repository Link to Selection"
3. The link is copied to your clipboard

### Copying a link to a file
1. Right-click on a file in the explorer or editor tab
2. Select "Copy Repository Link to File"
3. The link is copied to your clipboard

### Using custom domains
1. Open the command palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run "Open Repo Anchor Settings"
3. Enable "Always use custom domain"
4. Add one or more custom domains
5. Select the domain you want to use

## Extension Settings

This extension contributes the following settings:

* `repoanchor.useCustomUrl`: Enable/disable using a custom URL instead of the repository remote URL
* `repoanchor.customUrl`: The currently selected custom URL
* `repoanchor.customDomains`: List of custom domains that can be selected
* `repoanchor.lastUsedDomain`: The last used custom domain

## Supported Repository Hosting Services

The extension automatically detects and formats links for:
- GitHub
- GitLab
- Bitbucket
- Azure DevOps

For other hosting services, a generic link format is used.

## Requirements

- Git must be installed and available in your PATH
- The repository must have a remote URL configured

## License

MIT

---

**Enjoy!**
