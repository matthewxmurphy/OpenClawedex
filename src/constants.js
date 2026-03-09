"use strict";

/**
 * OpenClawedex
 * Built for Matthew X. Murphy's operational OpenClaw setup.
 *
 * These constants intentionally centralize the project defaults so every
 * command reports and mutates the same model path, transport hint, and agent id.
 */

const DEFAULT_MODEL = "openai-codex/gpt-5.4";
const DEFAULT_TRANSPORT = "auto";
const DEFAULT_AGENT_ID = "main";
const PROJECT_NAME = "OpenClawedex";
const PROJECT_VERSION = require("../package.json").version;

module.exports = {
  DEFAULT_AGENT_ID,
  DEFAULT_MODEL,
  DEFAULT_TRANSPORT,
  PROJECT_NAME,
  PROJECT_VERSION,
};
