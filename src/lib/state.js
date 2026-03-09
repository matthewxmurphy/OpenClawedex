"use strict";

const fs = require("fs");
const path = require("path");

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

const BRIDGE_SPECS = [
  { channelId: "imessage", tool: "imsg", label: "iMessage" },
  { channelId: "reminders", tool: "remindctl", label: "Reminders" },
  { channelId: "notes", tool: "memo", label: "Notes" },
  { channelId: "things", tool: "things", label: "Things" },
  { channelId: "peekaboo", tool: "peekaboo", label: "Peekaboo" },
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isChannelEnabled(channel) {
  if (!isPlainObject(channel)) return false;
  if (typeof channel.enabled === "boolean") return channel.enabled;
  return Object.keys(channel).length > 0;
}

function isExecutable(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() && (stat.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

function isWrapperBinary(filePath) {
  try {
    const sample = fs.readFileSync(filePath, "utf8");
    return sample.includes("REMOTE_BIN=") && sample.includes("run_remote()");
  } catch {
    return false;
  }
}

function resolveToolBinary(tool, paths) {
  const candidates = [
    path.join(paths.openclawHome, "bin", tool),
    ...String(process.env.PATH || "")
      .split(path.delimiter)
      .filter(Boolean)
      .map((dir) => path.join(dir, tool)),
  ];

  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);

    if (!isExecutable(candidate)) continue;

    const source = isWrapperBinary(candidate) || candidate.startsWith(`${paths.openclawHome}${path.sep}bin${path.sep}`)
      ? "wrapper"
      : "local";

    return {
      path: candidate,
      source,
    };
  }

  return null;
}

function summarizeBridge(config, paths) {
  const channels = isPlainObject(config?.channels) ? config.channels : {};
  const tools = BRIDGE_SPECS.map((spec) => {
    const channel = isPlainObject(channels[spec.channelId]) ? channels[spec.channelId] : null;
    const binary = resolveToolBinary(spec.tool, paths);
    const remoteHost = typeof channel?.remoteHost === "string" && channel.remoteHost.trim()
      ? channel.remoteHost.trim()
      : null;
    const enabled = isChannelEnabled(channel);

    return {
      ...spec,
      enabled,
      remoteHost,
      binaryPath: binary?.path || null,
      supportMode: binary?.source || null,
      ready: enabled && Boolean(binary),
    };
  });

  const enabledTools = tools.filter((entry) => entry.enabled);
  const readyTools = enabledTools.filter((entry) => entry.ready);
  const missingTools = enabledTools.filter((entry) => !entry.ready);

  return {
    anyEnabled: enabledTools.length > 0,
    enabledTools,
    readyTools,
    missingTools,
    suggestedSkill: "macos-bridge",
    tools,
  };
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
    bridge: summarizeBridge(config, paths),
    readyForOpenAICodex:
      exists(paths.codexAuth) && exists(paths.openclawConfig) && openaiCodexProfiles.length > 0,
  };
}

module.exports = {
  BRIDGE_SPECS,
  detectProviderProfiles,
  isChannelEnabled,
  modelPrimary,
  summarizeBridge,
  summarizeState,
};
