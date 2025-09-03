# Change Log

## [0.3.0] - 2024-12-19

### Changed
- Major refactoring to entire codebase
- Enhanced `Logger` class
- Improved cross-platform path handling and validation
- Updated dependencies and devDependencies to latest versions
- Enhanced VS Code engine requirement to `^1.90.0`

### Removed
- **BREAKING**: Removed `synceverything.confirmBeforeSync` configuration setting
- Removed `src/core/profile.ts` file
- Removed `vsc-extension-quickstart.md` documentation file

### Added
- New `IGistCollection` type and `IKeybinds` interface
- Enhanced error handling and retry mechanisms in GistService
- Improved authentication logic with better error handling
- New `pathExists` utility function for file validation
- Enhanced logging capabilities & logger implementation

### Fixed
- Improved file path validation across different platforms
- Better error handling for GitHub authentication
- Enhanced retry logic for API calls

## [0.2.0] - 2024-XX-XX

### Changed
- Deprecated Manual Paths Settings as the interface for setting custom paths
- Added a `Set Manual Paths` option to the `Show Menu` command to replace the deprecated settings

### Deprecated
- `synceverything.customSettingsPath`: Custom path for settings.json
- `synceverything.customKeybindingsPath`: Custom path for keybindings.json

## [0.1.0] - 2024-XX-XX

### Added
- Initial beta release
- Core sync functionality
- GitHub Gist integration
- Profile management
- Extension sync with confirmation
- Settings and keybindings sync
- Progress tracking and logging