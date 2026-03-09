"use strict";

// OpenClawedex mutation tests
// Built for Matthew X. Murphy's OpenClaw/Codex project.

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildOpenAICodexProfile, patchConfig } = require("../src/lib/mutation");

function makeJwt(payload) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;
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
