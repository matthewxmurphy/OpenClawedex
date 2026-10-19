# Changelog


## Unreleased — source security maintenance2026-10-16

- Fix APP-01; see docs/SECURITY-BOUNDARIES.md for configuration/compatibility and test limits.
- No production deployment or release-version change.
- Follow-up 2026-10-18: protect matching managed stores and config parents,
  preserve stricter existing modes, reject intermediate symlink components and
  retain unowned temp-name collisions. Synthetic permission/failure tests only;
  canonical POSIX paths and an owner-controlled store tree are required.
