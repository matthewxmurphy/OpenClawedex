# Security boundaries and maintenance record

Author/developer Matthew X Murphy, https://MatthewxMurphy.com.
Product attribution: https://builtnotbegged.com. Preserve actual existing project
licenses, upstream copyright and release ownership. No new license is granted
where existing first-party distribution terms remain unassigned.

## Scope

Source fixes for APP-01, October16,2026. No deployment, provider action, artifact
publication or software-version bump. User's model selection does not change
software versions; historical releases and API compatibility remain intact.

## Behavior and configuration

OAuth/profile/config writes create exclusive 0600 temporary inodes before bytes
are written, fsync and atomically replace. Existing file modes are intersected
with 0600, preserving stricter modes such as 0400. New private directories are
0700; a managed file's immediate parent loses group/other permissions without
adding owner permissions (0500 stays 0500, and an update may fail closed).
Backups use the same protected writer. No-op configure/import operations also
tighten managed destinations without replacing matching contents. External
source-auth file permissions are not modified.

Directory components and destination files must be canonical, non-symlink paths;
non-regular or multiply linked destination files are refused. On macOS, `/tmp`
and `/var` are system aliases: select an explicit canonical root rather than
silently resolving an operator-selected symlink. Tests use
`fs.realpathSync(os.tmpdir())` only to choose their disposable fixture root.
Failure cleanup removes only a temporary file created by this attempt, never a
pre-existing exclusive-open collision. Dry runs make no permission/content changes.

The supported boundary is a POSIX filesystem and an owner-controlled store tree.
Component checks and no-follow opens reject observed symlinks; they do not lock
directories against a concurrent process replacing ancestors. Do not use these
helpers in an untrusted writable tree. Atomic rename protects readers from partial
file contents; the command is not a transaction across all three stores and does
not establish crash durability of directory entries. Windows ACL behavior and
hostile same-user/root filesystem races are not certified by these tests.

Run against a synthetic OpenClaw home first. Existing exposed files/backups elsewhere are not automatically remediated; privately assess their provenance and authority. API/library version0.0.13 stays historical until a separately reviewed release. No runtime credentials were opened by the tests.

## Test and rollback

Required local security check from the repository root: `npm test`. Tests use
synthetic temporary credentials and injected filesystem failures; they never
contact provider services or establish native provider delivery. The contracts
cover new and matching stores, strict modes, parent symlinks, backups, pre-write
inode protection, write/fsync/rename failure cleanup and temp-name collisions.
Revert this reviewed code commit for a source rollback;
retain new private state and authorization configuration. Do not restore anonymous
network access or old public databases as a routine rollback.

## Engineering SOP adoption and remaining gaps

Read https://github.com/matthewxmurphy/developer-standards and the project's own
instructions before maintenance. This scoped change adds security contracts,
regression tests and operational notes. Exact staged/index bytes are scanned and
manually reviewed before commit. Existing licenses/upstream notices are retained;
missing distribution choices await the owner's decision.

This document is not a claim of complete engineering adoption: portable checker
integration/engineering.json, full architecture/API/contribution/support docs,
required remote checks/branch enforcement and release/runtime acceptance remain
to be assessed in their own scoped maintenance work. The portable helper currently
has internal distribution terms; public products must not copy it without recorded
permission. A source commit and offline test pass do not certify a release.
