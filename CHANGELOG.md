# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-04-19

### Added
- Initial public release.
- Commands: `setup`, `snapshot`, `tap`, `type`, `scroll`, `screenshot`, `assert`, `logs`.
- Accessibility tree snapshot with stable sequential refs (`m1`, `m2`, …) cached at `/tmp/agent-mobile-snapshot.json`.
- Structured error reporting via `fail({ code, message, suggestion })`.
- YAML injection protection on all user-supplied strings passed to Maestro flows.
- iOS Simulator and Android Emulator support via `xcrun simctl` and `adb`.
- MIT license, Contributor Covenant 2.1 code of conduct, contributing guide.

[Unreleased]: https://github.com/jeanpfs/agent-mobile/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/jeanpfs/agent-mobile/releases/tag/v1.0.0
