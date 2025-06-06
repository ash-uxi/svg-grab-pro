document.addEventListener('DOMContentLoaded', function() {
    // Get theme toggle buttons
    const darkButton = document.querySelector('[data-theme="dark"]');
    const lightButton = document.querySelector('[data-theme="light"]');
    const allSitesToggle = document.getElementById('allSitesToggle');
    const permissionStatusOn = document.getElementById('permissionStatus-on');
    const permissionStatusOff = document.getElementById('permissionStatus-off');
    
    // Function to safely access storage
    function safeStorage() {
        try {
            // Test if chrome.storage is accessible
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                return {
                    getItem: (key, callback) => {
                        chrome.storage.local.get(key, (result) => {
                            callback(result[key] || null);
                        });
                    },
                    setItem: (key, value) => {
                        let item = {};
                        item[key] = value;
                        chrome.storage.local.set(item);
                    }
                };
            }
            
            // Fall back to localStorage if chrome.storage isn't available
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return {
                getItem: (key, callback) => {
                    callback(localStorage.getItem(key));
                },
                setItem: (key, value) => {
                    localStorage.setItem(key, value);
                }
            };
        } catch (e) {
            // If storage is not accessible, use an in-memory object
            console.log("Storage not accessible, using in-memory storage");
            const memoryStorage = {};
            return {
                getItem: (key, callback) => {
                    callback(memoryStorage[key] || null);
                },
                setItem: (key, value) => {
                    memoryStorage[key] = value;
                }
            };
        }
    }
    
    // Initialize storage
    const storage = safeStorage();
    
    // Function to apply theme
    function applyTheme(theme) {
        console.log("Applying theme:", theme);
        
        // Remove theme class
        document.body.classList.remove('dark-theme', 'light-theme');
        
        // Remove active class from all buttons
        darkButton.classList.remove('active');
        lightButton.classList.remove('active');
        
        // Apply selected theme
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            darkButton.classList.add('active');
        } else if (theme === 'light') {
            document.body.classList.add('light-theme');
            lightButton.classList.add('active');
        }
        
        // Save preference safely
        try {
            // Use consistent key name 'svgGrabProTheme' across storage mechanisms
            storage.setItem('svgGrabProTheme', theme);
            
            // Also set directly in localStorage for content script to find
            localStorage.setItem('svgGrabProTheme', theme);
            
            // Notify background script to update the icon
            chrome.runtime.sendMessage({
                action: "themeChanged",
                theme: theme
            });
        } catch (e) {
            console.log("Could not save theme preference");
        }
    }
    
    // Ensure permission state and UI are in sync
    function syncPermissionUI() {
        if (chrome && chrome.permissions) {
            chrome.permissions.contains({
                origins: ["<all_urls>"]
            }, function(hasPermission) {
                // Always update storage to match actual permission state
                storage.setItem('allSitesEnabled', hasPermission);
                // Update UI
                allSitesToggle.checked = hasPermission;
                updatePermissionStatus(hasPermission);
            });
        } else {
            // Fallback if permissions API is not available
            storage.getItem('allSitesEnabled', function(enabled) {
                allSitesToggle.checked = enabled === true;
                updatePermissionStatus(enabled === true);
            });
        }
    }
    
    // Update the permission status text with animation
    function updatePermissionStatus(enabled) {
        if (enabled) {
            // Show "On"
            permissionStatusOn.style.opacity = '1';
            permissionStatusOn.style.transform = 'translateY(0)';
            permissionStatusOff.style.opacity = '0';
            permissionStatusOff.style.transform = 'translateY(-10px)';
        } else {
            // Show "Off"
            permissionStatusOn.style.opacity = '0';
            permissionStatusOn.style.transform = 'translateY(10px)';
            permissionStatusOff.style.opacity = '1';
            permissionStatusOff.style.transform = 'translateY(0)';
        }
    }
    
    // Handle permission toggle changes
    if (allSitesToggle) {
        allSitesToggle.addEventListener('change', function() {
            if (this.checked) {
                // Request permission
                chrome.permissions.request({
                    origins: ["<all_urls>"]
                }, function(granted) {
                    // Always sync UI with actual permission state
                    syncPermissionUI();
                    
                    if (granted) {
                        // Permission was granted, notify background script
                        chrome.runtime.sendMessage({
                            action: "permissionChanged",
                            allSitesEnabled: true
                        });
                    }
                });
            } else {
                // Remove permission
                chrome.permissions.remove({
                    origins: ["<all_urls>"]
                }, function(removed) {
                    // Always sync UI with actual permission state
                    syncPermissionUI();
                    
                    // Notify background script
                    chrome.runtime.sendMessage({
                        action: "permissionChanged",
                        allSitesEnabled: false
                    });
                });
            }
        });
    }
    
    // Directly handle click events for theme
    darkButton.onclick = function() {
        console.log("Dark button clicked");
        applyTheme('dark');
    };
    
    lightButton.onclick = function() {
        console.log("Light button clicked");
        applyTheme('light');
    };
    
    // Load saved theme or use default
    storage.getItem('svgGrabProTheme', function(storedTheme) {
        console.log("Retrieved stored theme:", storedTheme);
        if (storedTheme && (storedTheme === 'dark' || storedTheme === 'light')) {
            applyTheme(storedTheme);
        } else {
            applyTheme('dark'); // Default to dark theme
        }
    });
    
    // Initialize permission state and make sure UI reflects it
    syncPermissionUI();
});