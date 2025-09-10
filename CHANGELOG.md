# Changelog

All notable changes to the "filesystem-link-manager" VS Code extension are documented in this file.

This project adheres to Keep a Changelog (https://keepachangelog.com/) and follows Semantic Versioning.

## [0.3.0] - 2025-09-11

### Added
- First publishable release
- Webpack bundling to reduse the size of package

## [0.2.0] - 2025-09-11

### Changed
- Updated `.vscodeignore` to exclude not needed for extension information.
- Updated package description for clarity.
- Added license information to package.json.
- Reordered categories and keywords for better organization.
- Changed default logging level from 'debug' to 'info'.
- Modified file discovery function to return resolved paths for consistency.
- Updated PathSearchPattern interface to accept both string and array types for patterns.
- Enhanced tests to include logger service in attribute adjustment processes.
- Refactored processFileAttributeAdjustments function to include detailed logging at various stages.
- Improved error handling and user confirmation logging in file attribute adjustments.

### Added
- Added filesystem-link-manager-example1.gif from assets.

## [0.1.0] - 2025-09-08

### Added
- Initial PoC implementation of the Filesystem Link Manager VS Code extension (feature branch).
- Core modules and services located under `src/`:
	- Extension activation and command wiring (`src/extension.ts`).
	- Configuration parsing and validation (`src/symlink-creation/config/*`).
	- File discovery and pattern matching services (`src/symlink-creation/discovery/*`).
	- Copying, hardlink and symlink orchestration (`src/symlink-creation/copying/*`, `src/symlink-creation/linking/*`).
	- Command execution and post-execution command support (`src/symlink-creation/execution/*`).
	- File attribute adjustment utilities for platform-specific handling (`src/symlink-creation/file-attribute/*`).
	- Workflow orchestration to coordinate multi-step operations (`src/symlink-creation/workflow/*`).
	- Logging and transports (`src/logging/*`) and container setup helpers (`src/container/*`).
	- Domain error types and small domain helpers in `src/common`.
	- Unit tests (Jest) for core services and functions (co-located `.test.ts` files) and basic coverage reporting (`jest.config.js`, `coverage/`).
	- README updates and a sample configuration file (`samples/config-sample.json`).

### Changed
- PoC work: architecture and APIs validated; not yet hardened for production. This may result in refactors before first release.
