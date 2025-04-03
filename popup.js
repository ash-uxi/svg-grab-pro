document.addEventListener('DOMContentLoaded', function() {
    // Get theme toggle buttons
    const darkButton = document.querySelector('[data-theme="dark"]');
    const lightButton = document.querySelector('[data-theme="light"]');
    
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
    
    // Directly handle click events
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
});