"use strict";

// OpenClawedex bridge state tests
// Built for Matthew X. Murphy's OpenClaw/Codex project.

const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { summarizeState } = require("../src/lib/state");

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "openclawedex-state-"));
}

function writeExecutable(filePath, contents = "#!/usr/bin/env bash\nexit 0\n") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
  fs.chmodSync(filePath, 0o755);
}

test("summarizeState reports wrapper-backed tools only when matching channels are enabled", () => {
  const tempDir = makeTempDir();
  const openclawHome = path.join(tempDir, ".openclaw");
  const codexHome = path.join(tempDir, ".codex");
  const configPath = path.join(openclawHome, "openclaw.json");
  const authProfilesPath = path.join(openclawHome, "agents", "main", "agent", "auth-profiles.json");
  const wrapperPath = path.join(openclawHome, "bin", "imsg");

  fs.mkdirSync(path.dirname(authProfilesPath), { recursive: true });
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(
    configPath,
    `${JSON.stringify({
      channels: {
        imessage: {
          enabled: true,
          remoteHost: "agent2@192.168.88.12",
        },
        reminders: {
          enabled: false,
          remoteHost: "agent2@192.168.88.12",
        },
      },
    }, null, 2)}\n`,
  );
  fs.writeFileSync(authProfilesPath, `${JSON.stringify({ version: 1, profiles: {} }, null, 2)}\n`);
  writeExecutable(
    wrapperPath,
    "#!/usr/bin/env bash\nREMOTE_BIN='/opt/homebrew/bin/imsg'\nrun_remote() {\n  return 0\n}\n",
  );

  const summary = summarizeState({
    agentId: "main",
    authProfiles: authProfilesPath,
    codexAuth: path.join(codexHome, "auth.json"),
    codexAuthDest: path.join(codexHome, "auth.json"),
    codexHome,
    openclawConfig: configPath,
    openclawHome,
  });

  assert.equal(summary.bridge.anyEnabled, true);
  assert.deepEqual(summary.bridge.enabledTools.map((tool) => tool.tool), ["imsg"]);
  assert.deepEqual(summary.bridge.readyTools.map((tool) => tool.tool), ["imsg"]);
  assert.equal(summary.bridge.readyTools[0].supportMode, "wrapper");
});

test("summarizeState accepts a local binary as support for an enabled macOS-backed feature", () => {
  const tempDir = makeTempDir();
  const openclawHome = path.join(tempDir, ".openclaw");
  const codexHome = path.join(tempDir, ".codex");
  const configPath = path.join(openclawHome, "openclaw.json");
  const authProfilesPath = path.join(openclawHome, "agents", "main", "agent", "auth-profiles.json");
  const localBinDir = path.join(tempDir, "bin");
  const oldPath = process.env.PATH;

  fs.mkdirSync(path.dirname(authProfilesPath), { recursive: true });
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(
    configPath,
    `${JSON.stringify({
      channels: {
        notes: {
          enabled: true,
          remoteHost: "agent2@192.168.88.12",
        },
      },
    }, null, 2)}\n`,
  );
  fs.writeFileSync(authProfilesPath, `${JSON.stringify({ version: 1, profiles: {} }, null, 2)}\n`);
  writeExecutable(path.join(localBinDir, "memo"));
  process.env.PATH = `${localBinDir}${path.delimiter}${oldPath || ""}`;

  try {
    const summary = summarizeState({
      agentId: "main",
      authProfiles: authProfilesPath,
      codexAuth: path.join(codexHome, "auth.json"),
      codexAuthDest: path.join(codexHome, "auth.json"),
      codexHome,
      openclawConfig: configPath,
      openclawHome,
    });

    assert.equal(summary.bridge.anyEnabled, true);
    assert.deepEqual(summary.bridge.readyTools.map((tool) => tool.tool), ["memo"]);
    assert.equal(summary.bridge.readyTools[0].supportMode, "local");
    assert.deepEqual(summary.bridge.missingTools, []);
  } finally {
    process.env.PATH = oldPath;
  }
});
