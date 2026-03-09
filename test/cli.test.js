"use strict";

// OpenClawedex test suite
// Built for Matthew X. Murphy's gateway workflow.

const test = require("node:test");
const assert = require("node:assert/strict");

const { main, parseArgs } = require("../src/cli");
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

test("main prints the current version", () => {
  const originalLog = console.log;
  const originalExit = process.exit;
  let output = "";

  console.log = (value = "") => {
    output += String(value);
  };
  process.exit = (code) => {
    throw new Error(`EXIT:${code}`);
  };

  try {
    assert.throws(() => main(["--version"]), /EXIT:0/);
  } finally {
    console.log = originalLog;
    process.exit = originalExit;
  }

  assert.equal(output.trim(), projectVersion);
});
