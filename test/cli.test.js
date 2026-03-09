"use strict";

// OpenClawedex test suite
// Built for Matthew X. Murphy's gateway workflow.

const test = require("node:test");
const assert = require("node:assert/strict");

const { parseArgs, version } = require("../src/cli");
const { version: projectVersion } = require("../package.json");

test("parseArgs reads command and flags", () => {
  const parsed = parseArgs([
    "configure",
    "--openclaw-home",
    "/tmp/.openclaw",
    "--dry-run",
    "--agent",
    "main",
  ]);

  assert.equal(parsed.command, "configure");
  assert.equal(parsed.args["openclaw-home"], "/tmp/.openclaw");
  assert.equal(parsed.args["dry-run"], true);
  assert.equal(parsed.args.agent, "main");
});

test("parseArgs preserves positional tokens", () => {
  const parsed = parseArgs(["inspect", "extra-value"]);
  assert.deepEqual(parsed.args._, ["extra-value"]);
});

test("version prints the current version", () => {
  const originalLog = console.log;
  let output = "";

  console.log = (value = "") => {
    output += String(value);
  };

  try {
    version();
  } finally {
    console.log = originalLog;
  }

  assert.equal(output.trim(), projectVersion);
});
