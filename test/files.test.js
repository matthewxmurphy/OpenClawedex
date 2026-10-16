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


test("private writes and replacements stay 0600 even under a permissive umask", () => {
  const directory = makeTempDir();
  const target = path.join(directory, "auth.json");
  const prior = process.umask(0);
  try {
    writeJson(target, { synthetic: true }, false);
    assert.equal(fs.statSync(target).mode & 0o777, 0o600);
    fs.chmodSync(target, 0o644);
    writeJson(target, { synthetic: "replacement" }, false);
    assert.equal(fs.statSync(target).mode & 0o777, 0o600);
    assert.deepEqual(fs.readdirSync(directory), ["auth.json"]);
  } finally { process.umask(prior); fs.rmSync(directory, { recursive: true }); }
});

test("symlink destinations are rejected without changing the referent", () => {
  const directory = makeTempDir(), actual = path.join(directory, "actual.json"), link = path.join(directory, "link.json");
  fs.writeFileSync(actual, "original"); fs.symlinkSync(actual, link);
  assert.throws(() => writeJson(link, { synthetic: true }, false), /symlink/);
  assert.equal(fs.readFileSync(actual, "utf8"), "original");
  const dangling = path.join(directory, "dangling.json");
  fs.symlinkSync(path.join(directory, "absent.json"), dangling);
  assert.throws(() => writeJson(dangling, { synthetic: true }, false), /symlink/);
  fs.rmSync(directory, { recursive: true });
});

test("a failed replacement removes temporary secret bytes", () => {
  const directory = makeTempDir(), target = path.join(directory, "existing-directory");
  fs.mkdirSync(target);
  assert.throws(() => writeJson(target, { synthetic: true }, false));
  assert.deepEqual(fs.readdirSync(directory), ["existing-directory"]);
  fs.rmSync(directory, { recursive: true });
});
