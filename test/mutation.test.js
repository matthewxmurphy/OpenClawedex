// Copyright (c) 2026 Matthew X Murphy — https://MatthewxMurphy.com
// Product: https://builtnotbegged.com — SPDX-License-Identifier: MIT
"use strict";

// OpenClawedex mutation tests
// Built for Matthew X. Murphy's OpenClaw/Codex project.

const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { buildOpenAICodexProfile, configureState, patchConfig, syncOpenAICodexProfile } = require("../src/lib/mutation");

function makeJwt(payload) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "openclawedex-mutation-"));
}

test("patchConfig rewrites default model and transport", () => {
  const input = {
    agents: {
      defaults: {
        model: {
          primary: "ollama/gpt-oss:20b",
        },
      },
      list: [
        {
          id: "main",
          model: "ollama/gpt-oss:20b",
        },
      ],
    },
  };

  const { config, updatedAgent } = patchConfig(input, {
    agentId: "main",
    model: "openai-codex/gpt-5.4",
    transport: "auto",
  });

  assert.equal(updatedAgent, "main");
  assert.equal(config.agents.defaults.model.primary, "openai-codex/gpt-5.4");
  assert.equal(
    config.agents.defaults.models["openai-codex/gpt-5.4"].params.transport,
    "auto",
  );
  assert.equal(config.agents.list[0].model, "openai-codex/gpt-5.4");
});

test("patchConfig keeps object-shaped agent overrides object-shaped", () => {
  const input = {
    agents: {
      defaults: {},
      list: [
        {
          id: "main",
          model: {
            primary: "ollama/gpt-oss:20b",
            fallbacks: ["openrouter/auto"],
          },
        },
      ],
    },
  };

  const { config } = patchConfig(input, {
    agentId: "main",
    model: "openai-codex/gpt-5.4",
    transport: "websocket",
  });

  assert.deepEqual(config.agents.list[0].model, {
    primary: "openai-codex/gpt-5.4",
    fallbacks: ["openrouter/auto"],
  });
});

test("patchConfig preserves declared local and cloud model refs", () => {
  const input = {
    models: {
      providers: {
        ollama: {
          models: [
            { id: "llama3.2:3b" },
          ],
        },
        alibaba: {
          models: [
            { id: "qwen-plus" },
          ],
        },
      },
    },
    agents: {
      defaults: {
        model: {
          primary: "ollama/llama3.2:3b",
        },
        heartbeat: {
          model: "ollama/llama3.2:3b",
        },
      },
      list: [
        {
          id: "main",
          model: "ollama/llama3.2:3b",
        },
        {
          id: "faceless",
          model: {
            primary: "alibaba/qwen-plus",
          },
        },
      ],
    },
  };

  const { config } = patchConfig(input, {
    agentId: "main",
    model: "openai-codex/gpt-5.4",
    transport: "auto",
  });

  assert.ok(config.agents.defaults.models["openai-codex/gpt-5.4"]);
  assert.ok(config.agents.defaults.models["ollama/llama3.2:3b"]);
  assert.ok(config.agents.defaults.models["alibaba/qwen-plus"]);
});

test("buildOpenAICodexProfile maps codex auth.json into auth-profiles shape", () => {
  const accessToken = makeJwt({ exp: 1774000000 });
  const idToken = makeJwt({ email: "peach.patch.0g@icloud.com" });
  const profile = buildOpenAICodexProfile({
    tokens: {
      access_token: accessToken,
      refresh_token: "rt_test",
      id_token: idToken,
      account_id: "acct_123",
    },
  });

  assert.equal(profile.profileId, "openai-codex:peach.patch.0g@icloud.com");
  assert.deepEqual(profile.credential, {
    type: "oauth",
    provider: "openai-codex",
    access: accessToken,
    refresh: "rt_test",
    expires: 1774000000 * 1000,
    accountId: "acct_123",
    email: "peach.patch.0g@icloud.com",
  });
});

test("configureState is idempotent when config and oauth profile already match", () => {
  const tempDir = makeTempDir();
  const openclawHome = path.join(tempDir, ".openclaw");
  const codexHome = path.join(tempDir, ".codex");
  const authProfilesPath = path.join(openclawHome, "agents", "main", "agent", "auth-profiles.json");
  const openclawConfigPath = path.join(openclawHome, "openclaw.json");
  const codexAuthPath = path.join(codexHome, "auth.json");
  const accessToken = makeJwt({ exp: 1774000000 });
  const idToken = makeJwt({ email: "peach.patch.0g@icloud.com" });

  fs.mkdirSync(path.dirname(authProfilesPath), { recursive: true });
  fs.mkdirSync(codexHome, { recursive: true });

  fs.writeFileSync(
    openclawConfigPath,
    `${JSON.stringify({
      agents: {
        defaults: {
          model: { primary: "openai-codex/gpt-5.4" },
          models: {
            "openai-codex/gpt-5.4": {
              params: { transport: "auto" },
            },
          },
        },
        list: [
          { id: "main", model: "openai-codex/gpt-5.4" },
        ],
      },
    }, null, 2)}\n`,
  );

  fs.writeFileSync(
    codexAuthPath,
    `${JSON.stringify({
      tokens: {
        access_token: accessToken,
        refresh_token: "rt_test",
        id_token: idToken,
        account_id: "acct_123",
      },
    }, null, 2)}\n`,
  );

  fs.writeFileSync(
    authProfilesPath,
    `${JSON.stringify({
      version: 1,
      profiles: {
        "openai-codex:peach.patch.0g@icloud.com": {
          type: "oauth",
          provider: "openai-codex",
          access: accessToken,
          refresh: "rt_test",
          expires: 1774000000 * 1000,
          accountId: "acct_123",
          email: "peach.patch.0g@icloud.com",
        },
      },
      lastGood: {
        "openai-codex": "openai-codex:peach.patch.0g@icloud.com",
      },
    }, null, 2)}\n`,
  );

  const beforeConfig = fs.readFileSync(openclawConfigPath, "utf8");
  const beforeProfiles = fs.readFileSync(authProfilesPath, "utf8");

  const result = configureState({
    agentId: "main",
    codexAuth: codexAuthPath,
    codexAuthDest: codexAuthPath,
    codexHome,
    openclawConfig: openclawConfigPath,
    openclawHome,
    authProfiles: authProfilesPath,
  }, {
    agentId: "main",
    model: "openai-codex/gpt-5.4",
    transport: "auto",
  });

  assert.equal(result.configChanged, false);
  assert.equal(result.backupPath, null);
  assert.equal(result.oauthStoreChanged, false);
  assert.equal(result.importedOauthProfile, false);
  assert.equal(fs.readFileSync(openclawConfigPath, "utf8"), beforeConfig);
  assert.equal(fs.readFileSync(authProfilesPath, "utf8"), beforeProfiles);
  for (const target of [openclawConfigPath, authProfilesPath, codexAuthPath]) {
    assert.equal(fs.statSync(target).mode & 0o777, 0o600, "unchanged managed files are still protected");
    assert.equal(fs.statSync(path.dirname(target)).mode & 0o777, 0o700);
  }
  assert.deepEqual(
    fs.readdirSync(openclawHome).filter((entry) => entry.includes(".bak.openclawedex")),
    [],
  );
  fs.rmSync(tempDir, { recursive: true });
});

test("configure creates private stores and backups while preserving stricter existing modes", () => {
  const tempDir = makeTempDir(), openclawHome = path.join(tempDir, "openclaw"), codexHome = path.join(tempDir, "codex");
  const source = path.join(tempDir, "source.json"), config = path.join(openclawHome, "openclaw.json");
  const profile = path.join(openclawHome, "agents", "main", "agent", "auth-profiles.json");
  const paths = { agentId: "main", openclawHome, codexHome, codexAuth: source, codexAuthDest: path.join(codexHome, "auth.json"), openclawConfig: config, authProfiles: profile };
  const options = { agentId: "main", model: "openai-codex/gpt-5.4", transport: "auto" };
  fs.mkdirSync(openclawHome, { mode: 0o777 }); fs.chmodSync(openclawHome, 0o777);
  fs.writeFileSync(config, JSON.stringify({ agents: { defaults: { model: { primary: "synthetic/local" } } } }), { mode: 0o644 });
  fs.writeFileSync(source, JSON.stringify({ tokens: { access_token: makeJwt({ exp: 1774000000 }), refresh_token: "synthetic-refresh", id_token: makeJwt({ email: "fixture@example.invalid" }) } }), { mode: 0o644 });
  try {
    const first = configureState(paths, options);
    assert.equal(first.configChanged, true); assert.equal(first.importedOauthProfile, true);
    for (const target of [config, profile, paths.codexAuthDest, first.backupPath]) assert.equal(fs.statSync(target).mode & 0o777, 0o600);
    for (const parent of [openclawHome, codexHome, path.join(openclawHome, "agents"), path.join(openclawHome, "agents", "main"), path.dirname(profile)]) assert.equal(fs.statSync(parent).mode & 0o777, 0o700);
    assert.equal(fs.statSync(source).mode & 0o777, 0o644, "external source permissions remain untouched");
    for (const target of [config, profile, paths.codexAuthDest]) fs.chmodSync(target, 0o400);
    const second = configureState(paths, options);
    assert.equal(second.configChanged, false); assert.equal(second.oauthStoreChanged, false);
    for (const target of [config, profile, paths.codexAuthDest]) assert.equal(fs.statSync(target).mode & 0o777, 0o400);
  } finally { fs.rmSync(tempDir, { recursive: true }); }
});

test("profile import refuses an intermediate agent-directory symlink before reading or writing outside", () => {
  const tempDir = makeTempDir(), outside = makeTempDir(), home = path.join(tempDir, "home");
  fs.mkdirSync(home); fs.symlinkSync(outside, path.join(home, "agents"));
  try {
    assert.throws(() => syncOpenAICodexProfile({ codexAuth: path.join(tempDir, "unused-source.json"), authProfiles: path.join(home, "agents", "main", "agent", "auth-profiles.json") }, false), /symlink/);
    assert.deepEqual(fs.readdirSync(outside), []);
  } finally { fs.rmSync(tempDir, { recursive: true }); fs.rmSync(outside, { recursive: true }); }
});
