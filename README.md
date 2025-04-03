# SVG Grab Pro

A Chrome extension that helps you copy or download SVG logos from websites with a simple right-click.

## Features

- Custom right-click menu that appears only when clicking on SVG elements
- Copy SVG to clipboard with a single click
- Download SVG as a file
- Visual notifications for action feedback
- Works with inline SVGs and SVG elements in the page

## Project Structure

```
svg-grab-pro/
│
├── manifest.json       # Extension configuration
├── background.js       # Background script for message handling
├── contentScript.js    # Content script with custom right-click menu
├── popup.html          # Extension popup interface
├── popup.js            # Popup functionality
├── styles.css          # Styles for the popup
│
└── images/             # Extension icons (to be added)
    ├── icon16.png      # 16x16 icon
    ├── icon48.png      # 48x48 icon
    └── icon128.png     # 128x128 icon
```

## Setup Instructions

### 1. Add Extension Icons

Before loading the extension, you need to add icon files to the `images` directory:

- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can create these icons using any image editor or find free SVG icons online and convert them to the appropriate sizes.

### 2. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" by toggling the switch in the top-right corner
3. Click "Load unpacked" and select your extension directory
4. The extension should now be installed and ready to use

## Usage

1. Navigate to any website with SVG logos
2. Right-click on an SVG element
3. Instead of the standard browser context menu, you'll see the SVG Grab Pro menu with two options:
   - "Copy SVG" - Copies the SVG code to your clipboard
   - "Download SVG" - Downloads the SVG as a file named "logo.svg"
4. After selecting an option, a notification will appear confirming the action

## How It Works

Unlike most context menu extensions, SVG Grab Pro uses a custom right-click menu implementation that:
- Only appears when right-clicking on actual SVG elements
- Doesn't interfere with normal right-click behavior on non-SVG elements
- Extracts the complete SVG code including styles
- Provides immediate visual feedback through notifications

## Potential Enhancements

- Add support for SVGs served as background images
- Implement options for customizing download filename
- Add support for extracting SVGs from img/object tags (currently limited)
- Add stats tracking for copied/downloaded SVGs
- Add support for converting SVG to other formats (PNG, etc.)

## Troubleshooting

If the custom menu doesn't appear when right-clicking:
- Make sure you're right-clicking directly on an SVG element
- Some websites might use complex structures that make SVG detection difficult
- Try right-clicking on different parts of the logo
- Check the browser console for any error messages

## License

MIT