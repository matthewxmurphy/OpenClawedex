# Background Exec Disabled

## Summary

Symptom:

```text
Warning: background execution is disabled; running synchronously.
```

Meaning:

- `exec` was called with `background:true` or `yieldMs`
- OpenClaw did not allow the `process` tool
- the command ran inline instead of creating a background session

This can make OpenClaw feel stalled or fake-autonomous because long-running jobs
block the current turn instead of continuing in the background.

## Symptoms

- background coding-agent calls do not detach
- long-running `exec` calls block the session
- `yieldMs` has no practical effect
- the agent claims to be delegating work, but everything still feels serial
- `process list` / `process poll` are not usable in the affected runtime

## Root cause

The gateway tool policy allows `exec` but does not allow `process`.

Example broken shape:

```json
{
  "tools": {
    "allow": [
      "exec",
      "group:sessions",
      "sessions_spawn",
      "read",
      "write",
      "web_fetch"
    ]
  }
}
```

In that state, OpenClaw accepts foreground shell execution but refuses the
background session manager that `exec` depends on for detached work.

## Why it happens

OpenClaw's docs are explicit:

- `group:runtime` includes `exec` and `process`
- if `process` is disallowed, `exec` ignores `yieldMs` and `background`

Relevant docs:

- [exec.md](/usr/lib/node_modules/openclaw/docs/tools/exec.md)
- [background-process.md](/usr/lib/node_modules/openclaw/docs/gateway/background-process.md)
- [configuration-reference.md](/usr/lib/node_modules/openclaw/docs/gateway/configuration-reference.md#L1680)

## Fix

Allow `process`.

Preferred fix:

```json
{
  "tools": {
    "allow": [
      "group:runtime",
      "group:sessions",
      "read",
      "write",
      "web_fetch"
    ]
  }
}
```

Minimal fix:

```json
{
  "tools": {
    "allow": [
      "exec",
      "process",
      "group:sessions",
      "sessions_spawn",
      "read",
      "write",
      "web_fetch"
    ]
  }
}
```

Then restart the gateway process.

Important note:

- `deny` still wins if `process` is blocked elsewhere
- provider-specific or channel-specific tool policy can still disable it
- terminal coding agents also need `pty:true`

## How to verify

1. Run an `exec` call with `background:true` or `yieldMs`.
2. Confirm the warning is gone.
3. Confirm the result returns a `sessionId` instead of blocking inline.
4. Run `process list` and make sure the session appears.
5. Run `process poll` and confirm output can be drained later.

## Short post draft

If you keep seeing:

```text
Warning: background execution is disabled; running synchronously.
```

the problem is usually not sandboxing.

It usually means your OpenClaw tool policy allows `exec` but does not allow
`process`. Background exec depends on `process`, so OpenClaw falls back to
running inline.

Fix:

- allow `process`
- or allow `group:runtime` instead of only `exec`
- restart the gateway

Quick rule:

- `exec` runs commands
- `process` manages detached/background sessions
- without both, background work is fake
