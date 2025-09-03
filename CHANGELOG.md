# Change Log

All notable changes to the "synceverything" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.3.0] - 2024-12-19

### Added
- Status bar integration with sync icon for quick access to main menu
- Enhanced logging system with origin tracking for better debugging
- JSON5 support for parsing configuration files with comments and trailing commas
- `excludeExtensions` configuration option to exclude specific extensions from sync
- Comprehensive error handling with user-friendly error messages
- Progress indicators for all sync operations

### Changed
- **BREAKING**: Complete architecture refactor with class-based design
- Improved GitHub API integration with better error handling
- Enhanced path detection for settings and keybindings files
- Simplified codebase by removing redundant methods
- Default profile name changed from "Genesis" to "Origin"
- Updated package name to "sync-everything" for better discoverability
- Improved extension sync process with detailed confirmation dialogs

### Fixed
- Fixed bug where keybindings were not being written correctly during profile sync
- Fixed GitHub API endpoint URLs for profile deletion operations
- Fixed path resolution issues on different operating systems
- Improved error recovery when GitHub authentication fails
- Fixed profile creation and update operations

### Removed
- Removed deprecated profile management functions
- Cleaned up unused test files and configuration
- Removed redundant helper functions in favor of class methods

### Technical
- Migrated from function-based to class-based architecture
- Consolidated `SyncEverything` and `GistService` classes
- Enhanced Logger class with multiple log levels and formatting
- Improved TypeScript interfaces and type safety
- Better separation of concerns between components

## [0.2.0] - 2024-XX-XX

### Added
- `Set Manual Paths` option to the `Show Menu` command

### Deprecated
- Manual Paths Settings as the interface for setting custom paths

## [0.1.0] - 2024-XX-XX

### Added
- Initial beta release
- Core sync functionality
- GitHub Gist integration
- Profile management (create, update, delete)
- Extension sync with confirmation dialogs
- Settings and keybindings synchronization
- Progress tracking and logging system
- Command palette integration
- Cross-platform support (Windows, Linux, macOS)