# Changelog

All notable changes to the "filesystem-link-manager" VS Code extension are documented in this file.

This project adheres to Keep a Changelog (https://keepachangelog.com/) and follows Semantic Versioning.

## [unreleased]

### Changed
- Updated `.vscodeignore` to exclude not needed for extension information.

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
