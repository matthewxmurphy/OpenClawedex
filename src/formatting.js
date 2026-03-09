"use strict";

/**
 * OpenClawedex
 * Built for Matthew X. Murphy.
 *
 * Human-readable output is a first-class feature here because this project is
 * meant for operational use on live gateways, not just machine pipelines.
 */

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printLines(lines) {
  process.stdout.write(`${lines.join("\n")}\n`);
}

function formatInspect(summary) {
  const lines = [
    `Codex auth: ${summary.codexAuthExists ? "found" : "missing"} (${summary.paths.codexAuth})`,
    `OpenClaw config: ${summary.openclawConfigExists ? "found" : "missing"} (${summary.paths.openclawConfig})`,
    `Agent: ${summary.paths.agentId}`,
    `Default model: ${summary.currentDefaultModel || "unset"}`,
    `Agent override: ${summary.currentAgentModel || "none"}`,
    `OpenAI Codex auth profiles: ${summary.openaiCodexProfiles.length > 0 ? summary.openaiCodexProfiles.join(", ") : "none"}`,
    `OpenAI API auth profiles: ${summary.openaiProfiles.length > 0 ? summary.openaiProfiles.join(", ") : "none"}`,
  ];

  if (!summary.codexAuthExists) {
    lines.push("Next step: provide or create a Codex auth.json file.");
  } else if (summary.openaiCodexProfiles.length === 0) {
    lines.push(
      "Next step: run `openclaw models auth login --provider openai-codex` as the target OpenClaw user.",
    );
  } else {
    lines.push("Next step: verify runtime model selection and restart the gateway if needed.");
  }

  return lines;
}

function formatConfigure(result, dryRun) {
  const lines = [
    `Configured default model: ${result.model}`,
    `Transport hint: ${result.transport}`,
    `${result.syncedCodexAuth ? "Synced" : "Did not sync"} Codex auth: ${result.codexAuthDestination}`,
    `${dryRun ? "Would write backup" : "Backup written"}: ${result.backupPath}`,
  ];

  if (result.updatedAgent) {
    lines.push(`Updated agent override: ${result.updatedAgent}`);
  }

  if (result.needsOauthImport) {
    lines.push(
      "OpenAI Codex OAuth is still missing from auth-profiles.json. Run `openclaw models auth login --provider openai-codex` as the target OpenClaw user.",
    );
  } else {
    lines.push("OpenAI Codex auth profile is already present.");
  }

  return lines;
}

function formatDoctor(summary, expectedModel) {
  const findings = [];

  findings.push(`Gateway target agent: ${summary.paths.agentId}`);
  findings.push(`Expected primary model: ${expectedModel}`);
  findings.push(
    `Current primary model: ${summary.currentAgentModel || summary.currentDefaultModel || "unset"}`,
  );
  findings.push(`Codex auth.json: ${summary.codexAuthExists ? "present" : "missing"}`);
  findings.push(`OpenClaw config: ${summary.openclawConfigExists ? "present" : "missing"}`);
  findings.push(`Auth profiles: ${summary.authProfilesExists ? "present" : "missing"}`);
  findings.push(
    `OpenAI Codex runtime profile: ${summary.openaiCodexProfiles.length > 0 ? "present" : "missing"}`,
  );

  if (!summary.codexAuthExists) {
    findings.push("Action: sync or create ~/.codex/auth.json for the runtime user.");
  }
  if (!summary.authProfilesExists || summary.openaiCodexProfiles.length === 0) {
    findings.push("Action: run `openclaw models auth login --provider openai-codex` under the runtime user.");
  }
  if ((summary.currentAgentModel || summary.currentDefaultModel) !== expectedModel) {
    findings.push("Action: run `openclawedex configure` to point OpenClaw at openai-codex/gpt-5.4.");
  }
  if (summary.readyForOpenAICodex) {
    findings.push("Status: ready for OpenAI Codex routing.");
  }

  return findings;
}

module.exports = {
  formatConfigure,
  formatDoctor,
  formatInspect,
  printJson,
  printLines,
};
