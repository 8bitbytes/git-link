(function() {
    try {
        // Check if the VS Code API is available
        if (typeof acquireVsCodeApi !== 'function') {
            console.error('VS Code API not available!');
            return;
        }
        
        // Acquire the VS Code API
        const vscode = acquireVsCodeApi();
        let isWebviewActive = true;
        
        // Get references to DOM elements
        const useCustomUrlCheckbox = document.getElementById('use-custom-url');
        const currentDomainInput = document.getElementById('current-domain');
        const newDomainInput = document.getElementById('new-domain-input');
        const addDomainButton = document.getElementById('add-domain-button');
        const domainList = document.getElementById('domain-list');
        const cancelButton = document.getElementById('cancel-button');
        
        if (!useCustomUrlCheckbox || !currentDomainInput || !newDomainInput || 
            !addDomainButton || !domainList || !cancelButton) {
            console.error('Could not find one or more required UI elements');
            return;
        }
        
        // Store domains
        let customDomains = [];
        let currentDomain = currentDomainInput.value;
        let lastUsedDomain = currentDomain;
        let isSaving = false;
        let pendingSaveTimeout = null;
        
        // Add event listeners
        cancelButton.addEventListener('click', cancel);
        addDomainButton.addEventListener('click', addDomain);
        
        // Add change event listeners to inputs for auto-save
        useCustomUrlCheckbox.addEventListener('change', notifySettingsChanged);
        
        // Setup domain list event delegation for use/remove buttons
        domainList.addEventListener('click', function(e) {
            const target = e.target;
            
            // Handle 'Use' button click
            if (target.classList.contains('use-domain-button')) {
                const domain = target.getAttribute('data-domain');
                if (domain) {
                    setCurrentDomain(domain);
                }
            }
            
            // Handle 'Remove' button click
            if (target.classList.contains('remove-domain-button')) {
                const domain = target.getAttribute('data-domain');
                if (domain) {
                    removeDomain(domain);
                }
            }
        });
        
        // Initialize the custom domains from the current domain list
        function initDomainList() {
            const domainItems = domainList.querySelectorAll('.domain-item');
            customDomains = [];
            
            domainItems.forEach(item => {
                const domainText = item.querySelector('.domain-text');
                if (domainText && domainText.textContent) {
                    customDomains.push(domainText.textContent.trim());
                }
            });
            
            // Log the initial domains
            console.log('Initial domains:', customDomains);
        }
        
        // Call initialization
        initDomainList();
        
        // Safely post a message to VS Code
        function safePostMessage(message) {
            if (!isWebviewActive) {
                console.log('Webview is no longer active, not sending message:', message);
                return false;
            }
            
            try {
                vscode.postMessage(message);
                return true;
            } catch (e) {
                console.error('Error posting message to VS Code:', e);
                isWebviewActive = false;
                return false;
            }
        }
        
        // Function to notify the extension that settings have changed
        function notifySettingsChanged() {
            if (isSaving) return; // Avoid notification loops
            
            // Clear any pending save timeout
            if (pendingSaveTimeout) {
                clearTimeout(pendingSaveTimeout);
            }
            
            // Debounce the notification to avoid too many messages
            pendingSaveTimeout = setTimeout(() => {
                pendingSaveTimeout = null;
                
                // Send the notification
                safePostMessage({
                    command: 'settingsChanged',
                    useCustomUrl: useCustomUrlCheckbox.checked,
                    customUrl: currentDomain,
                    customDomains: customDomains,
                    lastUsedDomain: lastUsedDomain
                });
            }, 300);
        }
        
        // Function to add a new domain
        function addDomain() {
            const domain = newDomainInput.value.trim();
            
            if (!domain) {
                showValidationError('Please enter a domain to add');
                return;
            }
            
            // Normalize the domain (add https:// if missing protocol)
            const normalizedDomain = normalizeDomain(domain);
            
            // Validate domain format
            if (!isValidDomain(normalizedDomain)) {
                showValidationError('Please enter a valid domain or URL (e.g., github.mycompany.com or https://github.mycompany.com)');
                return;
            }
            
            // Check if domain already exists
            if (customDomains.includes(normalizedDomain)) {
                showValidationError('This domain is already in the list');
                return;
            }
            
            // Clear any previous validation errors
            clearValidationError();
            
            // Add to the array
            customDomains.push(normalizedDomain);
            
            // Auto-save settings
            notifySettingsChanged();
            
            // Update the UI
            updateDomainList();
            
            // Clear the input
            newDomainInput.value = '';
            
            // If this is the first domain and none selected yet, select it
            if (customDomains.length === 1 && !currentDomain) {
                setCurrentDomain(normalizedDomain);
            }
        }
        
        // Function to normalize domain (ensure proper protocol)
        function normalizeDomain(input) {
            // If it already has a protocol, return as is
            if (input.startsWith('http://') || input.startsWith('https://')) {
                return input;
            }
            
            // Return domain as-is without adding https://
            // This ensures compatibility with downstream logic that expects plain domains
            return input;
        }
        
        // Function to validate domain format
        function isValidDomain(input) {
            // Validate URLs with protocol
            if (input.startsWith('http://') || input.startsWith('https://')) {
                try {
                    const url = new URL(input);
                    return url.hostname.includes('.'); // At least one dot in hostname
                } catch (e) {
                    return false;
                }
            }
            
            // If input contains a path (has slash but no protocol)
            if (input.includes('/')) {
                try {
                    // Try parsing as URL with a dummy protocol
                    const url = new URL('https://' + input);
                    return url.hostname.includes('.'); // At least one dot in hostname
                } catch (e) {
                    return false;
                }
            }
            
            // Simple domain validation for domain-only inputs
            // Check for at least one dot and no spaces or invalid characters
            const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
            
            // Also allow IP addresses
            const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
            
            return domainRegex.test(input) || ipv4Regex.test(input);
        }
        
        // Function to show validation error
        function showValidationError(message) {
            const errorElement = document.getElementById('domain-validation-error');
            
            if (!errorElement) {
                // Create error element if it doesn't exist
                const errorDiv = document.createElement('div');
                errorDiv.id = 'domain-validation-error';
                errorDiv.className = 'validation-error';
                errorDiv.textContent = message;
                
                // Insert after the add domain row
                const addDomainRow = document.querySelector('.add-domain-row');
                if (addDomainRow && addDomainRow.parentNode) {
                    addDomainRow.parentNode.insertBefore(errorDiv, addDomainRow.nextSibling);
                }
            } else {
                // Update existing error message
                errorElement.textContent = message;
                errorElement.style.display = 'block';
            }
            
            // Add error class to input
            newDomainInput.classList.add('input-error');
        }
        
        // Function to clear validation error
        function clearValidationError() {
            const errorElement = document.getElementById('domain-validation-error');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
            
            // Remove error class from input
            newDomainInput.classList.remove('input-error');
        }
        
        // Function to remove a domain
        function removeDomain(domain) {
            // Remove from array
            customDomains = customDomains.filter(d => d !== domain);
            
            // If the current domain was removed, select another one if available
            if (currentDomain === domain) {
                if (customDomains.length > 0) {
                    setCurrentDomain(customDomains[0]);
                } else {
                    setCurrentDomain('');
                }
            }
            
            // Update the UI
            updateDomainList();
            
            // Auto-save settings
            notifySettingsChanged();
        }
        
        // Function to set the current domain
        function setCurrentDomain(domain) {
            if (currentDomain !== domain) {
                currentDomain = domain;
                currentDomainInput.value = domain;
                lastUsedDomain = domain;
                
                // Update selection visual in the UI
                updateDomainList();
                
                // Auto-save settings
                notifySettingsChanged();
            }
        }
        
        // Function to update the domain list display
        function updateDomainList() {
            if (customDomains.length === 0) {
                domainList.innerHTML = '<div class="domain-list-empty">No custom domains added yet. Add a domain above.</div>';
                return;
            }
            
            const domainItems = customDomains.map(domain => {
                const isSelected = domain === currentDomain;
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
            
            domainList.innerHTML = domainItems;
        }
        
        // Get current settings
        function getCurrentSettings() {
            return {
                command: 'currentSettings',
                useCustomUrl: useCustomUrlCheckbox.checked,
                customUrl: currentDomain,
                customDomains: customDomains,
                lastUsedDomain: lastUsedDomain
            };
        }
        
        // Cancel function - close the panel
        function cancel() {
            safePostMessage({
                command: 'cancel'
            });
            
            // Mark the webview as inactive to prevent further message sending
            isWebviewActive = false;
        }

        // Function to update cancel button text
        function updateCancelButtonText() {
            // Always use "Close" for the button
            if (cancelButton) {
                cancelButton.textContent = 'Close';
            }
        }

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            if (!isWebviewActive) return; // Skip if webview is no longer active
            
            const message = event.data;
            
            try {
                switch (message.command) {
                    case 'setSettings':
                        // Update domains
                        if (Array.isArray(message.customDomains)) {
                            customDomains = [...message.customDomains];
                        }
                        
                        // Update custom URL settings
                        useCustomUrl = !!message.useCustomUrl;
                        currentDomain = message.customUrl || '';
                        lastUsedDomain = message.lastUsedDomain || '';
                        
                        // Always ensure the cancel button says "Close"
                        updateCancelButtonText();
                        
                        // Update UI
                        useCustomUrlCheckbox.checked = useCustomUrl;
                        currentDomainInput.value = currentDomain;
                        
                        // Render domain list
                        updateDomainList();
                        break;
                    case 'settingsSaved':
                        // Settings were saved, update flag
                        isSaving = false;
                        break;
                    case 'requestCurrentSettings':
                        // The extension is requesting the current settings
                        safePostMessage(getCurrentSettings());
                        break;
                }
            } catch (err) {
                console.error('Error handling message:', err);
                
                // If it was a request for current settings, try to send back what we have
                if (message.command === 'requestCurrentSettings') {
                    try {
                        safePostMessage(getCurrentSettings());
                    } catch (e) {
                        console.error('Failed to send current settings:', e);
                    }
                }
            }
        });

        // Set up unload handler to ensure clean shutdown
        window.addEventListener('unload', () => {
            isWebviewActive = false;
            
            // Clear any pending timeouts
            if (pendingSaveTimeout) {
                clearTimeout(pendingSaveTimeout);
                pendingSaveTimeout = null;
            }
        });

        // Initialize the UI with "Close" button
        updateCancelButtonText();
    } catch (err) {
        console.error('Fatal error in webview script:', err);
    }
})(); 