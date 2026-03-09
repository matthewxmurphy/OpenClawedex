# Gateway Playbook

This is the practical flow OpenClawedex is designed around.

## Scenario

- Codex is signed in on a laptop or admin machine
- OpenClaw runs as a long-lived service user on a gateway host
- you want `main` to route through `openai-codex/gpt-5.4`
- you do not want to lose the old gateway config while changing it

## Recommended sequence

1. Copy the Codex auth file into reach of the gateway user.
2. Run:

```bash
openclawedex inspect --openclaw-home /home/openclaw/.openclaw
```

3. Apply config:

```bash
openclawedex configure --openclaw-home /home/openclaw/.openclaw
```

4. If `doctor` still says OpenAI Codex auth is missing, run:

```bash
openclaw models auth login --provider openai-codex
```

5. Re-run:

```bash
openclawedex doctor --openclaw-home /home/openclaw/.openclaw
```

## Why this order

- `inspect` is read-only and tells you whether you are about to fix the right machine
- `configure` only handles deterministic filesystem/config work
- `openclaw models auth login --provider openai-codex` remains the source of truth for the provider auth store
- `doctor` gives you the short operational answer after both steps
