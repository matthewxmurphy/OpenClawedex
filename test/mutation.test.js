"use strict";

// OpenClawedex mutation tests
// Built for Matthew X. Murphy's OpenClaw/Codex project.

const test = require("node:test");
const assert = require("node:assert/strict");

const { patchConfig } = require("../src/lib/mutation");

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
