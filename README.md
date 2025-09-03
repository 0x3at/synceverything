# Sync Everything

A powerful VS Code extension that enables seamless synchronization of your VS Code/Cursor settings, extensions, and keybindings across multiple machines using GitHub Gists.

## Features

-   🔄 **Profile Management**: Create, update, and manage multiple sync profiles
-   ⚡ **One-Click Sync**: Pull and apply settings with a single click
-   🔒 **Secure Storage**: Uses GitHub Gists for secure, private storage of your settings
-   🛠 **Comprehensive Sync**: Syncs:
    -   VS Code/Cursor Settings
    -   Installed Extensions
    -   Custom Keybindings
-   🔍 **Smart Conflict Resolution**: Handles extension installation/uninstallation with confirmation
-   📊 **Progress Tracking**: Visual progress indicators for sync operations
-   📝 **Enhanced Logging**: Comprehensive logging with origin tracking for better troubleshooting
-   🏗️ **Improved Architecture**: Streamlined codebase with better error handling and maintainability
-   🎯 **Status Bar Integration**: Quick access to sync menu via status bar icon

## Requirements

-   VS Code or Cursor editor (untested on windsurf)
-   GitHub account
-   GitHub authentication (handled automatically by the extension)

## Installation

1. Open VS Code/Cursor
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "Sync Everything"
4. Click Install

## Usage

### Initial Setup

1. After installation, you'll be prompted to sign in to GitHub
2. The extension will automatically create an "Origin" profile with your current settings if no profiles have been created yet
3. If profiles do exist already, use the pull profile command to sync your current editor

### Important Notes

-   Comments in both `settings.json` and `keybindings.json` files cannot be preserved during sync operations
-   The extension has been tested on:
    -   Windows (VS Code and Cursor)
    -   Linux (VS Code and Cursor)
-   Untested but should work on:
    -   macOS (VS Code and Cursor)
    -   Windsurf (requires manual configuration of settings path)

### Commands

Access all commands through the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

-   `Sync Everything: Show Menu` - Opens the main menu
    -   `Sync Everything: Create Profile` - Create a new sync profile
    -   `Sync Everything: Pull Profile` - Pull and apply a profile
    -   `Sync Everything: Update Profile` - Update an existing profile
    -   `Sync Everything: Delete Profile` - Delete a profile
    -   `Sync Everything: Show Logs` - View detailed operation logs
    -   `Sync Everything: Set Paths Manually` - Select custom paths for your settings and keybindings

### Extension Settings

This extension contributes the following settings:

-   `synceverything.confirmBeforeSync`: Enable/disable confirmation before syncing extensions
-   `synceverything.excludeExtensions`: Array of extension IDs to exclude from sync operations
-   ~~`synceverything.customSettingsPath`: Custom path for settings.json~~ **(Deprecated in beta 0.2)**
-   ~~`synceverything.customKeybindingsPath`: Custom path for keybindings.json~~ **(Deprecated in beta 0.2)**

## Known Issues

-  Reading files on MacOS returns an undefined object on some devices

## Release Notes

### 0.3.0 (Beta)

-   **Major Architecture Refactor**: Complete rewrite with improved class-based architecture
-   **Enhanced Error Handling**: Better error messages and recovery mechanisms
-   **Improved Logging**: Added origin tracking and more verbose logging for debugging
-   **Status Bar Integration**: Added sync icon in status bar for quick access
-   **Code Simplification**: Removed redundant methods and consolidated functionality
-   **Bug Fixes**: Fixed keybindings sync issue and GitHub API endpoint corrections
-   **Better Path Management**: Improved automatic detection of settings and keybindings files
-   **JSON5 Support**: Enhanced JSON parsing with support for comments and trailing commas

### 0.2.0 (Beta)

-   Deprecated Manual Paths Settings as the interface for setting custom paths
-   Added a `Set Manual Paths` option to the `Show Menu` command to replace the deprecated settings

### 0.1.0 (Beta)

-   Initial beta release
-   Core sync functionality
-   GitHub Gist integration
-   Profile management
-   Extension sync with confirmation
-   Settings and keybindings sync
-   Progress tracking and logging

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Enjoy!**
