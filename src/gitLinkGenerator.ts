import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GitHost {
    name: string;
    pattern: RegExp;
    format: (base: string, branch: string, filePath: string, startLine: number, endLine?: number) => string;
}

// Define common Git hosting services
const gitHosts: GitHost[] = [
    {
        name: 'GitHub',
        pattern: /github\.com/i,
        format: (base, branch, filePath, startLine, endLine) => 
            `${base}/blob/${branch}/${filePath}${endLine ? `#L${startLine}-L${endLine}` : `#L${startLine}`}`
    },
    {
        name: 'GitLab',
        pattern: /gitlab\.com/i,
        format: (base, branch, filePath, startLine, endLine) => 
            `${base}/-/blob/${branch}/${filePath}${endLine ? `#L${startLine}-${endLine}` : `#L${startLine}`}`
    },
    {
        name: 'Bitbucket',
        pattern: /bitbucket\.org/i,
        format: (base, branch, filePath, startLine, endLine) => 
            `${base}/src/${branch}/${filePath}${endLine ? `#lines-${startLine}:${endLine}` : `#lines-${startLine}`}`
    },
    {
        name: 'Azure DevOps',
        pattern: /dev\.azure\.com|visualstudio\.com/i,
        format: (base, branch, filePath, startLine, endLine) => 
            `${base}?path=${encodeURIComponent(filePath)}&version=GB${branch}${endLine ? `&line=${startLine}&lineEnd=${endLine}` : `&line=${startLine}`}`
    }
];

export async function generateGitLink(filePath: string, startLine: number, endLine?: number): Promise<string> {
    try {
        const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!rootPath) {
            throw new Error('No workspace folder open');
        }

        // Get current branch or commit hash
        const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: rootPath });
        const branchOrCommit = branch.trim() === 'HEAD' 
            ? (await execAsync('git rev-parse HEAD', { cwd: rootPath })).stdout.trim() 
            : branch.trim();

        // Create relative path
        const relativePath = path.relative(rootPath, filePath).replace(/\\/g, '/');

        // Get config settings
        const config = vscode.workspace.getConfiguration('gitLink');
        const useCustomUrl = Boolean(config.get('useCustomUrl'));
        const customDomains = config.get('customDomains') as string[] || [];
        const lastUsedDomain = String(config.get('lastUsedDomain') || '');
        
        // Determine which custom domain to use
        let customDomain = '';
        if (useCustomUrl) {
            if (lastUsedDomain && customDomains.includes(lastUsedDomain)) {
                // Use the last used domain if available
                customDomain = lastUsedDomain;
            } else if (customDomains.length > 0) {
                // Otherwise use the first domain in the list
                customDomain = customDomains[0];
                
                // Update the last used domain in config
                config.update('lastUsedDomain', customDomain, vscode.ConfigurationTarget.Global);
            }
        }

        // Get the remote origin URL
        const { stdout: remoteUrl } = await execAsync('git config --get remote.origin.url', { cwd: rootPath });
        if (!remoteUrl) {
            throw new Error('Could not determine git remote URL');
        }
        
        // Clean up remote URL to get base URL
        const cleanedRemoteUrl = remoteUrl.trim()
            .replace(/\.git$/, '')
            .replace(/^git@([^:]+):/, 'https://$1/')
            .replace(/^ssh:\/\/git@([^/]+)\//, 'https://$1/');
        
        // Determine base URL
        let baseUrl: string;
        if (useCustomUrl && customDomain) {
            const customDomainTrimmed = customDomain.trim();
            
            // Check if the domain has a protocol
            const hasProtocol = customDomainTrimmed.startsWith('http://') || customDomainTrimmed.startsWith('https://');
            
            if (customDomainTrimmed.includes('/')) {
                // If the custom domain includes a path, use it completely
                baseUrl = hasProtocol ? customDomainTrimmed : `https://${customDomainTrimmed}`;
            } else {
                // If the custom domain is just a domain, replace only the domain part
                // Extract the path from the cleaned remote URL
                const pathRegex = /^https?:\/\/[^/]+(\/.*)/;
                const pathMatch = pathRegex.exec(cleanedRemoteUrl);
                const repoPath = pathMatch ? pathMatch[1] : '';
                
                // Build the new URL with custom domain + original path
                const domain = hasProtocol ? customDomainTrimmed : `https://${customDomainTrimmed}`;
                baseUrl = domain.replace(/\/$/, '') + repoPath;
            }
        } else {
            baseUrl = cleanedRemoteUrl;
        }

        // Find the appropriate host format
        const host = gitHosts.find(h => {
            try {
                return h.pattern.test(baseUrl);
            } catch (e) {
                console.error(`Error testing pattern for host ${h.name}:`, e);
                return false;
            }
        });
        
        if (host) {
            return host.format(baseUrl, branchOrCommit, relativePath, startLine, endLine);
        } else {
            // Generic format as fallback
            return `${baseUrl}/blob/${branchOrCommit}/${relativePath}${endLine ? `#L${startLine}-L${endLine}` : `#L${startLine}`}`;
        }
    } catch (error) {
        throw new Error(`Error generating Repo link: ${error}`);
    }
} 