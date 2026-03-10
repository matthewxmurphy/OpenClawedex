# Gateway Routing Notes — 2026-03-10

Operator note for the OpenClaw gateway at `mmurphy@192.168.88.11`.

## Goal

- Keep `main` on `openai-codex/gpt-5.4`.
- Keep low-cost recurring cron work on a local model so it does not burn Codex usage.
- Keep named sub-agents on Alibaba Cloud models.

## What Broke

Two different problems were stacked together:

1. The old `local` provider was dead.
   - Configured endpoint: `http://172.17.0.1:1234/v1`
   - Result: connection failure from the gateway runtime.
   - Effect: jobs requesting `local/Phi-3.5-mini-instruct.Q8_0.gguf` could not actually use that provider.

2. `main` had an effectively narrowed model allowlist.
   - `openclaw models status --json` showed:
     - `allowed = ["openai-codex/gpt-5.4"]`
   - Even after cron payloads were changed to local/Ollama models, the runtime could still fall back to Codex because only Codex was allowed for `main`.

## Confirmed Runtime Facts

- Gateway default model:
  - `openai-codex/gpt-5.4`
- Direct local Ollama is healthy on:
  - `http://192.168.88.11:11434`
- Confirmed local Ollama models:
  - `ollama/gpt-oss:20b`
  - `ollama/llama3.2:3b`

## Gateway Changes Applied

File touched:
- `/home/openclaw/.openclaw/openclaw.json`

Backups created:
- `/home/openclaw/.openclaw/openclaw.json.bak.codex-20260310-local-heartbeat`
- `/home/openclaw/.openclaw/openclaw.json.bak.codex-20260310-faceless-alibaba`
- `/home/openclaw/.openclaw/openclaw.json.bak.codex-20260310-model-allow`
- `/home/openclaw/.openclaw/cron-list.before-20260310.json`

Routing changes:
- `agents.defaults.heartbeat.model` changed to:
  - `ollama/llama3.2:3b`
- `agents.defaults.models` widened to include:
  - `openai-codex/gpt-5.4`
  - `ollama/llama3.2:3b`
  - `ollama/gpt-oss:20b`
  - `alibaba/qwen-max`
  - `alibaba/qwen-plus`
  - `alibaba/qwen-turbo`
  - `local/Phi-3.5-mini-instruct.Q8_0.gguf`

Cron jobs changed from dead `local/Phi-3.5-mini-instruct.Q8_0.gguf` to working local Ollama:
- `63222f55-004d-4e0e-b443-22a5f735e592` `moltbook-heartbeat`
- `a570fdb7-aa76-455b-aeb3-a5bcc4f67a89` `ops-status-hourly`
- `c2e05c09-56a0-4e4a-8d23-47862449b297` `boss-receipts-5m`
- `9f19256c-cc5f-470d-9cce-0987dfe071a5` `moltbook-build-log`

Cron tuning applied:
- model:
  - `ollama/llama3.2:3b`
- timeout:
  - `300`
- `lightContext`:
  - `true`

## Agent Routing Snapshot

Expected routing after fixes:
- `main` -> `openai-codex/gpt-5.4`
- `codex` -> `alibaba/qwen-max`
- `neo` -> `alibaba/qwen-plus`
- `morpheus` -> `alibaba/qwen-plus`
- `trinity` -> `alibaba/qwen-plus`
- `smith` -> `alibaba/qwen-plus`
- `oracle` -> `alibaba/qwen-max`
- `architect` -> `alibaba/qwen-max`
- `merovingian` -> `alibaba/qwen-plus`
- `keymaker` -> `alibaba/qwen-plus`
- `tank` -> `alibaba/qwen-turbo`
- `dozer` -> `alibaba/qwen-turbo`
- `mouse` -> `alibaba/qwen-turbo`
- `niobe` -> `alibaba/qwen-turbo`
- `faceless` -> `alibaba/qwen-plus`

Important note:
- `faceless` was originally inheriting `openai-codex/gpt-5.4`.
- It was explicitly pinned to `alibaba/qwen-plus` during this repair.

## OpenClawedex Bug Found

Repo fix shipped in:
- `OpenClawedex v0.0.10`
- commit: `d508a60`

Bug:
- `OpenClawedex configure` could leave `agents.defaults.models` too narrow.
- On this OpenClaw build, that behaved like a model allowlist and caused non-default `main` model requests to fall back to Codex.

Fix:
- preserve declared provider model refs in `agents.defaults.models` during patching
- keep Codex as the default target without collapsing local/cloud alternatives

## Current Caveat

At the time of this note:
- the old Codex rate-limit entries are still present in cron history
- the gateway now allows the intended local model path
- the dead `local` provider on `172.17.0.1:1234` is still broken and should not be used until repaired

If future cron jobs start falling back again, first check:

1. `openclaw models status --json`
2. whether `allowed` still includes `ollama/llama3.2:3b`
3. `openclaw cron list --json`
4. `openclaw cron runs --id <job-id> --limit 5`
5. direct Ollama health at `http://192.168.88.11:11434/api/tags`

## Provider Notes

Already configured on the gateway:
- Alibaba Cloud API key
- OpenCode API key
- OpenRouter API key
- OpenAI API key
- OpenAI Codex OAuth

Not currently trusted for local recurring work:
- `local/Phi-3.5-mini-instruct.Q8_0.gguf` via `172.17.0.1:1234`

Preferred local recurring model for now:
- `ollama/llama3.2:3b`
