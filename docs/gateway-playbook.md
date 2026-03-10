# Gateway Playbook

This is the practical flow OpenClawedex is designed around.

For the current recommended model and provider split, see
[provider-policy.md](provider-policy.md).

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

## Optional macOS-backed features

If your gateway enables any of these channels:

- `imessage`
- `reminders`
- `notes`
- `things`
- `peekaboo`

OpenClawedex will now check whether the matching tools already resolve:

- locally on Linux
- or through installed `macos-bridge` wrappers

Recommended sequence:

1. Set `channels.<feature>.enabled = true` and `remoteHost = user@mac-host` in `openclaw.json`.
2. Install the skill:

```bash
clawhub install macos-bridge
```

3. Install wrappers for enabled features only:

```bash
cd ~/.openclaw/skills/macos-bridge
scripts/install-macos-pack.sh \
  --target-dir /usr/local/bin \
  --openclaw-config /home/openclaw/.openclaw/openclaw.json \
  --default-host agent2@192.168.88.12
```

4. Verify:

```bash
scripts/verify-macos-pack.sh \
  --target-dir /usr/local/bin \
  --openclaw-config /home/openclaw/.openclaw/openclaw.json
```

If the feature is disabled, OpenClawedex skips the bridge check. If the tool already exists locally, OpenClawedex accepts that and does not force the bridge skill.

## Why this order

- `inspect` is read-only and tells you whether you are about to fix the right machine
- `configure` only handles deterministic filesystem/config work
- `openclaw models auth login --provider openai-codex` remains the source of truth for the provider auth store
- `doctor` gives you the short operational answer after both steps
