# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Minimum supported Node.js is now 22 (`engines.node` `>=22`); CI tests on Node 22 and 24.

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

[Unreleased]: https://github.com/jeanpfs/agent-mobile/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/jeanpfs/agent-mobile/releases/tag/v1.0.1
[1.0.0]: https://www.npmjs.com/package/maestro-agent-mobile/v/1.0.0
