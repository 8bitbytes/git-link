import * as vscode from 'vscode';

export interface SettingsData {
    useCustomUrl: boolean;
    customUrl: string;
    customDomains: string[];
    lastUsedDomain: string;
}

export function getSettingsWebviewContent(
    webview: vscode.Webview, 
    extensionUri: vscode.Uri,
    settings: SettingsData
): string {
    const darkMode = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
    
    // Get the proper webview URI for resources
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
        extensionUri,
        'media', 
        'settings.js'
    ));
    
    // Generate the HTML for the domain list
    const domainListItems = settings.customDomains.map(domain => {
        const isSelected = domain === settings.customUrl;
        return `
            <div class="domain-item ${isSelected ? 'selected' : ''}">
                <div class="domain-text">${domain}</div>
                <div class="domain-actions">
                    <button class="use-domain-button" data-domain="${domain}">Use</button>
                    <button class="remove-domain-button" data-domain="${domain}">Remove</button>
                </div>
            </div>
        `;
    }).join('');
    
    const selectedDomain = settings.customUrl || (settings.customDomains.length > 0 ? settings.customDomains[0] : '');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};">
    <title>Git Link Settings</title>
    <style>
        body {
            padding: 20px;
            color: ${darkMode ? '#cccccc' : '#333333'};
            font-size: 13px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: ${darkMode ? '#1e1e1e' : '#ffffff'};
        }

        h1 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: ${darkMode ? '#ffffff' : '#000000'};
        }

        h2 {
            font-size: 1.2rem;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
            color: ${darkMode ? '#ffffff' : '#000000'};
        }

        button {
            border: none;
            padding: 8px 12px;
            margin-right: 8px;
            margin-bottom: 8px;
            width: auto;
            text-align: center;
            color: #ffffff;
            background-color: #0e639c;
            cursor: pointer;
            border-radius: 2px;
        }

        button:hover {
            background-color: #1177bb;
        }

        button.secondary {
            color: #ffffff;
            background-color: #3a3d41;
        }

        button.secondary:hover {
            background-color: #45494e;
        }

        button:disabled {
            opacity: 0.5;
            cursor: default;
        }

        button.active {
            background-color: #1177bb;
        }

        input {
            display: block;
            width: 100%;
            border: 1px solid #3c3c3c;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 8px;
            margin-bottom: 12px;
            color: #cccccc;
            background-color: #3c3c3c;
            border-radius: 2px;
            box-sizing: border-box;
        }

        input[type="checkbox"] {
            display: inline-block;
            width: auto;
            margin-right: 8px;
            vertical-align: middle;
        }

        .actions {
            display: flex;
            flex-direction: row;
            margin-top: 20px;
            margin-bottom: 20px;
        }

        .row {
            display: flex;
            flex-direction: column;
            margin-bottom: 12px;
        }

        .checkbox-row {
            display: flex;
            flex-direction: row;
            align-items: center;
            margin-bottom: 12px;
        }

        .row label {
            margin-bottom: 4px;
            font-weight: bold;
            color: #ffffff;
        }

        .checkbox-row label {
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 0;
        }

        .description {
            color: #9d9d9d;
            font-size: 0.9em;
            margin-top: 4px;
            margin-bottom: 12px;
        }

        .validation-error {
            color: #f48771;
            margin-top: 8px;
            margin-bottom: 12px;
            padding: 8px;
            background-color: rgba(244, 135, 113, 0.1);
            border-radius: 3px;
            border-left: 3px solid #f48771;
        }

        .input-error {
            border-color: #f48771 !important;
        }

        .domain-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            margin-bottom: 8px;
            border: 1px solid #3c3c3c;
            border-radius: 4px;
            background-color: #252526;
        }

        .domain-item.selected {
            border-color: #0e639c;
            background-color: #2a2d2e;
        }

        .domain-text {
            flex-grow: 1;
            font-weight: 500;
        }

        .domain-actions {
            display: flex;
            gap: 4px;
        }

        .domain-actions button {
            padding: 4px 8px;
            margin: 0;
            font-size: 12px;
        }

        .use-domain-button {
            background-color: #0e639c;
        }

        .remove-domain-button {
            background-color: #5f5f5f;
        }

        .domain-list {
            margin-top: 16px;
            margin-bottom: 16px;
            max-height: 300px;
            overflow-y: auto;
        }

        .domain-list-empty {
            color: #9d9d9d;
            font-style: italic;
            padding: 8px;
            text-align: center;
            border: 1px dashed #3c3c3c;
            border-radius: 4px;
        }

        .section {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #3c3c3c;
        }

        .add-domain-row {
            display: flex;
            gap: 8px;
        }

        .add-domain-row input {
            margin-bottom: 0;
        }
    </style>
</head>
<body>
    <h1>Git Link Settings</h1>
    
    <div class="section">
        <div class="checkbox-row">
            <input type="checkbox" id="use-custom-url" ${settings.useCustomUrl ? 'checked' : ''}>
            <label for="use-custom-url">Always use custom domain</label>
        </div>
        
        <p class="description">When enabled, Git links will use a custom domain instead of the Git remote URL.</p>
    </div>
    
    <div class="section">
        <h2>Custom Domains</h2>
        
        <div class="add-domain-row">
            <input type="text" id="new-domain-input" placeholder="Enter domain or URL (e.g., github.mycompany.com or https://github.mycompany.com)">
            <button id="add-domain-button">Add Domain</button>
        </div>
        
        <p class="description">
            Add domains to use for Git links. Include the protocol (https://) if needed, or just enter the domain name.
            If a domain includes a path (contains '/'), the entire URL will be used. 
            If it's just a domain (e.g., 'github.mycompany.com'), only the domain part will be replaced while keeping the repository path.
        </p>
        
        <div class="domain-list" id="domain-list">
            ${domainListItems.length > 0 ? domainListItems : 
            '<div class="domain-list-empty">No custom domains added yet. Add a domain above.</div>'}
        </div>
        
        <div class="row">
            <label for="current-domain">Currently selected domain:</label>
            <input type="text" id="current-domain" value="${selectedDomain}" readonly>
        </div>
    </div>
    
    <div class="actions">
        <button id="cancel-button" class="secondary">Close</button>
    </div>

    <script src="${scriptUri}"></script>
</body>
</html>`;
} 