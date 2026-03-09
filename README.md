# OpenClawedex

<p align="center">
  <img src="docs/media/openclawedex-v0.0.3-social.png" alt="OpenClawedex v0.0.3 release graphic" width="100%">
</p>

OpenClawedex is standalone tooling for Matthew X. Murphy's OpenClaw gateway workflow.

It exists for one specific operational problem:

- Codex authentication often happens on one machine
- OpenClaw runs as a different service user
- model routing lives in `~/.openclaw/openclaw.json`
- provider credentials live in `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- the real pain is in the gaps between those files

This repo turns that into a repeatable project instead of a pile of one-off fixes.

In one line: OpenClawedex helps you inspect, sync, and switch an OpenClaw gateway onto Codex OAuth and `openai-codex/gpt-5.4` without editing live state blind.

## Scope

OpenClawedex is for:

- inspecting OpenClaw state for Codex readiness
- syncing Codex auth into the target runtime user
- updating OpenClaw defaults to `openai-codex/gpt-5.4`
- leaving timestamped backups before config edits
- producing a human-readable doctor report with next steps

OpenClawedex is not for:

- publishing OpenClaw skills
- replacing the OpenClaw onboarding wizard
- pretending OAuth is already imported when it is not
- provisioning the full host from scratch

## Project layout

```text
bin/
  openclawedex.js         Thin executable wrapper
src/
  cli.js                  Argument handling and command dispatch
  constants.js            Shared defaults and strings
  paths.js                Filesystem path resolution
  formatting.js           Human and JSON output helpers
  commands/
    inspect.js            State inspection command
    configure.js          Config mutation command
    doctor.js             Higher-level readiness report
  lib/
    files.js              JSON/file/backup helpers
    state.js              OpenClaw/Codex state inspection
    mutation.js           Config rewrite logic
docs/
  architecture.md         Why the project exists
  gateway-playbook.md     Real-world usage flow
  design-notes.md         Design decisions and boundaries
examples/
  openclaw.json.example   Example target config shape
test/
  cli.test.js             CLI parsing and formatting checks
  mutation.test.js        Config rewrite behavior
```

## Commands

### `inspect`

Inspect an OpenClaw state directory and report:

- whether Codex auth exists
- whether OpenClaw config exists
- whether `auth-profiles.json` already contains `openai-codex`
- what the current default model is
- whether the requested agent has its own model override

Example:

```bash
openclawedex inspect \
  --openclaw-home /home/openclaw/.openclaw \
  --codex-auth /home/openclaw/.codex/auth.json
```

JSON output:

```bash
openclawedex inspect --json
```

### `configure`

Update OpenClaw to use Codex as the primary model path.

By default this command:

- syncs the chosen `auth.json` into the target `~/.codex/auth.json`
- imports a matching `openai-codex` OAuth profile into `auth-profiles.json` when usable Codex tokens are present
- updates `agents.defaults.model.primary`
- adds `agents.defaults.models["openai-codex/gpt-5.4"].params.transport = "auto"`
- updates the selected agent override if that agent exists
- writes a timestamped backup next to `openclaw.json`

Example:

```bash
openclawedex configure \
  --openclaw-home /home/openclaw/.openclaw \
  --codex-auth /home/openclaw/.codex/auth.json
```

Dry run:

```bash
openclawedex configure --dry-run
```

### `doctor`

Produce a more explicit operational report than `inspect`.

It answers:

- what is missing
- what is already correct
- what still needs a real OpenClaw OAuth import
- whether the current config already points at Codex

Example:

```bash
openclawedex doctor --openclaw-home /home/openclaw/.openclaw
```

## Typical gateway flow

1. Copy or create Codex auth for the target runtime user.
2. Run `openclawedex inspect`.
3. Run `openclawedex configure`.
4. Re-run `openclawedex doctor`.

If the doctor still reports a missing `openai-codex` runtime profile, the local
`auth.json` did not contain usable OAuth tokens and you still need the native
OpenClaw login flow:

```bash
openclaw models auth login --provider openai-codex
```

## Important limitation

This project can sync `~/.codex/auth.json`, import an `openai-codex` OAuth
profile from usable Codex tokens, and set the model defaults. It still does not
manufacture missing OAuth tokens out of thin air.

If the source `auth.json` lacks usable `access_token` / `refresh_token` values,
OpenClawedex will tell you that directly and you still need the native OpenClaw
OAuth login flow.

## Development

Install locally:

```bash
npm link
```

Run tests:

```bash
npm test
```

Run directly:

```bash
node ./bin/openclawedex.js inspect
```

Show the release version:

```bash
openclawedex --version
```
