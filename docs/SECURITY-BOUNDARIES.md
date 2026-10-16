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

OAuth/profile/config writes now create exclusive0600 temporary inodes, fsync and atomically replace; private directories are0700. Backups use the same protected writer. Symlink destinations are rejected; failed writes remove temporary bytes.

Run against a synthetic OpenClaw home first. Existing exposed files/backups elsewhere are not automatically remediated; privately assess their provenance and authority. API/library version0.0.13 stays historical until a separately reviewed release. No runtime credentials were opened by the tests.

## Test and rollback

Required local security check: `npm test`. Tests use synthetic temporary state,
mock adapters or local HTTP/Fastify fixtures; they never contact provider services
or establish native delivery. Syntax/build and rendered checks are recorded in
the private source receipt. Revert this reviewed code commit for a source rollback;
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
