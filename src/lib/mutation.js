"use strict";

const path = require("path");

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

function jsonEquals(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
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

function decodeJwtPayload(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function buildOpenAICodexProfile(authJson) {
  const tokens = authJson?.tokens || {};
  const accessToken = typeof tokens.access_token === "string" ? tokens.access_token.trim() : "";
  const refreshToken = typeof tokens.refresh_token === "string" ? tokens.refresh_token.trim() : "";
  const accountId = typeof tokens.account_id === "string" ? tokens.account_id.trim() : "";
  const idToken = typeof tokens.id_token === "string" ? tokens.id_token.trim() : "";

  if (!accessToken || !refreshToken) {
    return null;
  }

  const accessPayload = decodeJwtPayload(accessToken) || {};
  const idPayload = decodeJwtPayload(idToken) || {};
  const email = typeof idPayload.email === "string" && idPayload.email.trim()
    ? idPayload.email.trim()
    : null;
  const expires = Number.isFinite(accessPayload.exp)
    ? Number(accessPayload.exp) * 1000
    : Date.now() + (55 * 60 * 1000);
  const profileId = `openai-codex:${email || "default"}`;

  return {
    profileId,
    credential: {
      type: "oauth",
      provider: "openai-codex",
      access: accessToken,
      refresh: refreshToken,
      expires,
      ...(accountId ? { accountId } : {}),
      ...(email ? { email } : {}),
    },
  };
}

function syncOpenAICodexProfile(paths, dryRun) {
  if (!exists(paths.codexAuth)) {
    return { imported: false, reason: "missing-source-auth", profileId: null };
  }

  const authJson = readJsonIfExists(paths.codexAuth);
  const nextProfile = buildOpenAICodexProfile(authJson);
  if (!nextProfile) {
    return { imported: false, reason: "missing-codex-tokens", profileId: null };
  }

  const existingStore = readJsonIfExists(paths.authProfiles) || { version: 1, profiles: {} };
  const existingProfile = existingStore.profiles?.[nextProfile.profileId] || null;
  const profileMatches = JSON.stringify(existingProfile) === JSON.stringify(nextProfile.credential);
  const lastGoodProfile = existingStore.lastGood?.["openai-codex"] || null;
  const lastGoodChanged = lastGoodProfile !== nextProfile.profileId;

  if (!dryRun && (!profileMatches || lastGoodChanged)) {
    const nextStore = {
      ...existingStore,
      version: existingStore.version || 1,
      profiles: {
        ...(existingStore.profiles || {}),
        [nextProfile.profileId]: nextProfile.credential,
      },
      lastGood: {
        ...(existingStore.lastGood || {}),
        "openai-codex": nextProfile.profileId,
      },
    };

    ensureDir(path.dirname(paths.authProfiles), false);
    writeJson(paths.authProfiles, nextStore, false);
  }

  return {
    imported: !profileMatches,
    changed: !profileMatches || lastGoodChanged,
    reason: profileMatches ? "already-imported" : "imported",
    profileId: nextProfile.profileId,
  };
}

function configureState(paths, options) {
  const dryRun = Boolean(options.dryRun);
  const config = readJsonIfExists(paths.openclawConfig);
  if (!config) {
    throw new Error(`OpenClaw config not found at ${paths.openclawConfig}`);
  }

  const syncResult = syncCodexAuth(paths, dryRun);
  const oauthResult = syncOpenAICodexProfile(paths, dryRun);
  const patchResult = patchConfig(config, options);
  const configChanged = !jsonEquals(config, patchResult.config);
  const backupPath = configChanged ? buildBackupPath(paths.openclawConfig) : null;

  if (!dryRun && configChanged) {
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
    configChanged,
    oauthProfileId: oauthResult.profileId,
    importedOauthProfile: oauthResult.imported,
    oauthStoreChanged: oauthResult.changed,
    updatedAgent: patchResult.updatedAgent,
    needsOauthImport:
      !oauthResult.profileId &&
      detectProviderProfiles(profiles, "openai-codex").length === 0,
  };
}

module.exports = {
  buildOpenAICodexProfile,
  configureState,
  decodeJwtPayload,
  ensureModelObject,
  jsonEquals,
  patchConfig,
  syncOpenAICodexProfile,
  syncCodexAuth,
};
