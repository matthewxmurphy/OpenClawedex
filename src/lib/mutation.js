"use strict";

const { DEFAULT_MODEL, DEFAULT_TRANSPORT } = require("../constants");
const {
  buildBackupPath,
  compareFiles,
  copyFile,
  ensureDir,
  exists,
  readFile,
  readJsonIfExists,
  setMode,
  writeFile,
  writeJson,
} = require("./files");
const { detectProviderProfiles } = require("./state");

/**
 * OpenClawedex
 * Built for Matthew X. Murphy.
 *
 * Mutation logic lives here so the CLI only orchestrates. This makes the
 * project easier to test and keeps all config rewrite rules in one place.
 */

function ensureModelObject(modelValue, primary) {
  if (typeof modelValue === "string") {
    return { primary };
  }
  return {
    ...(modelValue || {}),
    primary,
  };
}

function patchConfig(config, options) {
  const model = options.model || DEFAULT_MODEL;
  const transport = options.transport || DEFAULT_TRANSPORT;
  const agentId = options.agentId;

  const next = JSON.parse(JSON.stringify(config));
  next.agents = next.agents || {};
  next.agents.defaults = next.agents.defaults || {};
  next.agents.defaults.model = ensureModelObject(next.agents.defaults.model, model);
  next.agents.defaults.models = next.agents.defaults.models || {};

  const modelEntry = next.agents.defaults.models[model] || {};
  next.agents.defaults.models[model] = {
    ...modelEntry,
    params: {
      ...(modelEntry.params || {}),
      transport,
    },
  };

  let updatedAgent = null;
  if (Array.isArray(next.agents.list)) {
    const agent = next.agents.list.find((entry) => entry && entry.id === agentId);
    if (agent) {
      agent.model = typeof agent.model === "string"
        ? model
        : ensureModelObject(agent.model, model);
      updatedAgent = agentId;
    }
  }

  return { config: next, updatedAgent };
}

function syncCodexAuth(paths, dryRun) {
  if (!exists(paths.codexAuth)) {
    return { synced: false, reason: "missing-source-auth" };
  }

  ensureDir(paths.codexHome, dryRun);

  const shouldCopy =
    paths.codexAuth !== paths.codexAuthDest ||
    !exists(paths.codexAuthDest) ||
    !compareFiles(paths.codexAuth, paths.codexAuthDest);

  if (!shouldCopy) {
    return { synced: false, reason: "already-synced" };
  }

  const source = readFile(paths.codexAuth);
  writeFile(paths.codexAuthDest, source, dryRun);
  setMode(paths.codexAuthDest, 0o600, dryRun);

  return { synced: true, reason: "copied" };
}

function configureState(paths, options) {
  const dryRun = Boolean(options.dryRun);
  const config = readJsonIfExists(paths.openclawConfig);
  if (!config) {
    throw new Error(`OpenClaw config not found at ${paths.openclawConfig}`);
  }

  const syncResult = syncCodexAuth(paths, dryRun);
  const patchResult = patchConfig(config, options);
  const backupPath = buildBackupPath(paths.openclawConfig);

  if (!dryRun) {
    copyFile(paths.openclawConfig, backupPath, false);
    writeJson(paths.openclawConfig, patchResult.config, false);
  }

  const profiles = readJsonIfExists(paths.authProfiles);

  return {
    syncedCodexAuth: syncResult.synced,
    codexAuthSource: paths.codexAuth,
    codexAuthDestination: paths.codexAuthDest,
    backupPath,
    model: options.model || DEFAULT_MODEL,
    transport: options.transport || DEFAULT_TRANSPORT,
    updatedAgent: patchResult.updatedAgent,
    needsOauthImport: detectProviderProfiles(profiles, "openai-codex").length === 0,
  };
}

module.exports = {
  configureState,
  ensureModelObject,
  patchConfig,
  syncCodexAuth,
};
