# Provider Policy

This document captures the current recommended routing policy for an
OpenClawedex-managed OpenClaw gateway.

The goal is simple:

- keep the coordinator smart
- keep heartbeat cheap and local
- keep worker load spread across non-Codex providers
- keep failure domains obvious when one account or provider rate-limits

## OAuth versus API keys

Use the minimum auth type each provider actually needs:

- `openai-codex`: Codex OAuth
- `openai`: API key
- `xai`: API key
- `alibaba`: API key
- `opencode`: API key
- `openrouter`: API key

Do not add separate "ChatGPT OAuth" just because Codex OAuth is already in use.
For OpenClaw routing, `openai-codex` already represents the ChatGPT/Codex sign-in
lane.

Do not add xAI OAuth for normal model access. The xAI API is key-based.

## Recommended routing

### Coordinator lane

- `main` -> `openai-codex/gpt-5.4`

Use this only for:

- coordination
- high-trust code changes
- operator-facing repair work
- tasks where the best reasoning quality matters more than cost

Do not use `main` for:

- cron heartbeats
- routine receipts
- noisy background work
- jobs that can be retried cheaply elsewhere

### Local reliability lane

Use local Ollama for anything that must keep running even when external APIs are
limited.

- `heartbeat` -> `ollama/llama3.2:3b`
- `moltbook-heartbeat` -> `ollama/llama3.2:3b`
- `ops-status-hourly` -> `ollama/llama3.2:3b`
- `boss-receipts-5m` -> `ollama/llama3.2:3b`
- `moltbook-build-log` -> `ollama/llama3.2:3b`

Use `ollama/gpt-oss:20b` only when a local task needs more reasoning than
`llama3.2:3b` can provide and latency is still acceptable.

### Worker cloud lanes

The current low-cost worker policy is:

- `codex` -> `alibaba/qwen-max`
- `oracle` -> `alibaba/qwen-max`
- `architect` -> `alibaba/qwen-max`
- `neo` -> `alibaba/qwen-plus`
- `morpheus` -> `alibaba/qwen-plus`
- `trinity` -> `alibaba/qwen-plus`
- `smith` -> `alibaba/qwen-plus`
- `merovingian` -> `alibaba/qwen-plus`
- `keymaker` -> `alibaba/qwen-plus`
- `faceless` -> `alibaba/qwen-plus`
- `tank` -> `alibaba/qwen-turbo`
- `dozer` -> `alibaba/qwen-turbo`
- `mouse` -> `alibaba/qwen-turbo`
- `niobe` -> `alibaba/qwen-turbo`

This keeps the main Codex lane reserved for work that actually benefits from it.

## OpenCode keys

Treat different OpenCode keys as different accounts, not as one shared pool.

That means:

- pin one key to one worker lane
- name the lane so failures are attributable
- do not rotate keys invisibly inside the same worker

Good pattern:

- `opencode-a` -> one specific key/account
- `opencode-b` -> another specific key/account
- `opencode-c` -> another specific key/account

Bad pattern:

- one generic `opencode` worker that silently swaps accounts on every run

When one lane starts rate-limiting, you want to know exactly which account hit
the wall.

## Big Pickle

Big Pickle should be treated as opportunistic capacity, not core infrastructure.

Recommended policy:

- use it only for non-critical research or summarization
- never use it for heartbeat
- never use it for the default `main` lane
- avoid using it for blocking automations
- cap it to a sparse schedule such as one small job every 4 hours

Until you have observed a stable real limit in your own account, treat Big Pickle
as "free until it is not," not as guaranteed baseline capacity.

## xAI

xAI is a reasonable overflow lane for:

- web-heavy summarization
- alternate-answer checks
- non-critical research passes

It should be configured with an API key, not a browser OAuth login.

## Node-aware policy

If you are splitting work across real hardware, the routing policy should match
the actual lane, not just the abstract agent name.

Recommended operational split:

- gateway `main` -> coordinator only
- `agent1` on M1 -> browser and control lane
- `agent2` on MacBook Pro -> live worker lane
- `agent3` on MacBook Pro -> second live worker lane
- Android tablet -> inbox and social lane
- iPad Pro -> review and approval lane

The model provider for each lane can still differ, but the lane ownership should
stay stable so receipts and failures are traceable.
