# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.3] - 2026-10-16

### Fixed
- `snapshot` returned no elements on iOS. The iOS hierarchy root has zero bounds and `enabled=false`, and the visibility filter pruned the whole tree at that root. The root is now always traversed; invisible subtrees below it are still skipped.

## [1.0.2] - 2026-10-16

### Changed
- Minimum supported Node.js is now 22 (`engines.node` `>=22`); CI tests on Node 22 and 24.
- Contributor guide for coding agents is now `AGENTS.md` (was `CLAUDE.md`).
- The release workflow extracts notes from this changelog and updates an existing GitHub release instead of failing.

### Security
- Cleared Dependabot security alerts in development dependencies.

## [1.0.1] - 2026-10-14

### Changed
- First release published from CI with provenance (1.0.0 was published by hand under the final package name).

## [1.0.0] - 2026-04-19

### Added
- Initial public release, published to npm as `maestro-agent-mobile` (`agent-mobile` and `agent-mobile-cli` belong to other projects). The command is still `agent-mobile`.
- Commands: `setup`, `snapshot`, `tap`, `type`, `scroll`, `screenshot`, `assert`, `logs`.
- Accessibility tree snapshot with stable sequential refs (`m1`, `m2`, …) cached at `/tmp/agent-mobile-snapshot.json`.
- Structured error reporting via `fail({ code, message, suggestion })`.
- YAML injection protection on all user-supplied strings passed to Maestro flows.
- iOS Simulator and Android Emulator support via `xcrun simctl` and `adb`.
- MIT license, Contributor Covenant 2.1 code of conduct, contributing guide.

[Unreleased]: https://github.com/jeanpfs/agent-mobile/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/jeanpfs/agent-mobile/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/jeanpfs/agent-mobile/releases/tag/v1.0.1
[1.0.0]: https://www.npmjs.com/package/maestro-agent-mobile/v/1.0.0
