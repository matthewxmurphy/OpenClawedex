"use strict";

const os = require("os");
const path = require("path");

/**
 * OpenClawedex
 * Built for Matthew X. Murphy.
 *
 * OpenClaw and Codex keep state in multiple homes. This module keeps path
 * expansion and path derivation in one place so command modules do not repeat
 * filesystem assumptions.
 */

function expandHome(rawPath) {
  if (!rawPath) return rawPath;
  if (rawPath === "~") return os.homedir();
  if (rawPath.startsWith("~/")) return path.join(os.homedir(), rawPath.slice(2));
  return rawPath;
}

function resolvePaths(args) {
  const openclawHome = path.resolve(
    expandHome(args["openclaw-home"] || path.join(os.homedir(), ".openclaw")),
  );
  const codexHome = path.resolve(
    expandHome(args["codex-home"] || path.join(os.homedir(), ".codex")),
  );
  const agentId = args.agent || "main";
  const codexAuth = path.resolve(
    expandHome(args["codex-auth"] || path.join(codexHome, "auth.json")),
  );

  return {
    agentId,
    codexAuth,
    codexAuthDest: path.join(codexHome, "auth.json"),
    codexHome,
    openclawConfig: path.join(openclawHome, "openclaw.json"),
    openclawHome,
    authProfiles: path.join(openclawHome, "agents", agentId, "agent", "auth-profiles.json"),
  };
}

module.exports = {
  expandHome,
  resolvePaths,
};
