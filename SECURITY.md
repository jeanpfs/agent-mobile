# Security Policy

## Supported versions

Only the latest released version on `main` receives security fixes.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security reports.

Instead, email **jean.pfs2@gmail.com** with:
- A description of the issue and its impact
- Steps to reproduce
- The affected version (`agent-mobile --version` or commit SHA)

You can expect an initial response within 7 days. If the report is confirmed, a fix will be prepared on a private branch, released, and disclosed in the CHANGELOG.

## Scope

agent-mobile is a thin CLI over [Maestro](https://maestro.mobile.dev/). If the vulnerability is in Maestro itself, please report it upstream at <https://github.com/mobile-dev-inc/Maestro/security>.

In-scope examples:
- Command, YAML, or shell injection via CLI arguments
- Arbitrary file read/write through crafted input (refs, paths, log capture)
- Privilege escalation through the installed binary

Out of scope:
- Vulnerabilities in Maestro, `xcrun`, `adb`, or the iOS/Android platforms
- Issues that require an already-compromised developer machine
