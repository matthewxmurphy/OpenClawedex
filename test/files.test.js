"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { readJsonIfExists, writeJson } = require("../src/lib/files");

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "openclawedex-files-"));
}

test("readJsonIfExists reports invalid JSON with the source path", () => {
  const tempDir = makeTempDir();
  const target = path.join(tempDir, "broken.json");
  fs.writeFileSync(target, "{\n");

  assert.throws(
    () => readJsonIfExists(target),
    (error) => error instanceof Error && error.message.includes(target) && error.message.includes("Invalid JSON"),
  );
});

test("writeJson writes data without leaving temp files behind", () => {
  const tempDir = makeTempDir();
  const target = path.join(tempDir, "state.json");

  writeJson(target, { ok: true }, false);

  assert.deepEqual(JSON.parse(fs.readFileSync(target, "utf8")), { ok: true });
  assert.deepEqual(
    fs.readdirSync(tempDir).sort(),
    ["state.json"],
  );
});
