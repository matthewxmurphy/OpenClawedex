# Architecture

`OpenClawedex` exists because the Codex/OpenClaw path crosses three separate concerns:

1. `~/.codex/auth.json`
   This is where the Codex CLI keeps the local sign-in state.

2. `~/.openclaw/openclaw.json`
   This is where OpenClaw decides which model the gateway should use.

3. `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
   This is where OpenClaw stores the imported provider credentials it can
   actually route through at runtime.

The common failure mode is:

- Codex is signed in
- OpenClaw is still pointed at `ollama/*` or `openai/*`
- `auth-profiles.json` has no `openai-codex` entry even though `~/.codex/auth.json` already has usable OAuth tokens
- users assume this is a “skill” problem when it is actually config + auth state

`OpenClawedex` keeps those checks and edits in one place so the setup is
repeatable and reviewable.
