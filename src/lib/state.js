"use strict";

const { exists, readJsonIfExists } = require("./files");

/**
 * OpenClawedex
 * Built for Matthew X. Murphy.
 *
 * This module inspects OpenClaw/Codex state without changing anything. The
 * command layer uses this to generate both terse summaries and richer doctor
 * reports from the same source of truth.
 */

function modelPrimary(modelValue) {
  if (!modelValue) return null;
  if (typeof modelValue === "string") return modelValue;
  if (typeof modelValue === "object") return modelValue.primary || null;
  return null;
}

function detectProviderProfiles(store, providerId) {
  if (!store || !store.profiles) return [];
  return Object.entries(store.profiles)
    .filter(([, profile]) => profile && profile.provider === providerId)
    .map(([profileId]) => profileId);
}

function summarizeState(paths) {
  const config = readJsonIfExists(paths.openclawConfig);
  const profiles = readJsonIfExists(paths.authProfiles);

  const agentList = config?.agents?.list || [];
  const agentEntry = Array.isArray(agentList)
    ? agentList.find((entry) => entry && entry.id === paths.agentId)
    : null;

  const openaiCodexProfiles = detectProviderProfiles(profiles, "openai-codex");
  const openaiProfiles = detectProviderProfiles(profiles, "openai");

  return {
    paths,
    codexAuthExists: exists(paths.codexAuth),
    openclawConfigExists: exists(paths.openclawConfig),
    authProfilesExists: exists(paths.authProfiles),
    currentDefaultModel: modelPrimary(config?.agents?.defaults?.model),
    currentAgentModel: modelPrimary(agentEntry?.model),
    openaiCodexProfiles,
    openaiProfiles,
    readyForOpenAICodex:
      exists(paths.codexAuth) && exists(paths.openclawConfig) && openaiCodexProfiles.length > 0,
  };
}

module.exports = {
  detectProviderProfiles,
  modelPrimary,
  summarizeState,
};
