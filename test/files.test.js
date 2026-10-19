// Copyright (c) 2026 Matthew X Murphy — https://MatthewxMurphy.com
// Product: https://builtnotbegged.com — SPDX-License-Identifier: MIT
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { copyFile, ensureDir, protectFile, readJsonIfExists, writeJson } = require("../src/lib/files");

function makeTempDir() {
  return fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "openclawedex-files-"));
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

test("new nested private parents and the temporary inode are protected before bytes", () => {
  const directory = makeTempDir(), parent = path.join(directory, "home", "agent"), target = path.join(parent, "auth.json");
  const originalWrite = fs.writeFileSync, previousUmask = process.umask(0o022);
  let observed = false;
  fs.writeFileSync = function (descriptor, ...args) {
    if (typeof descriptor === "number") {
      observed = true;
      assert.equal(fs.fstatSync(descriptor).mode & 0o777, 0o600);
      assert.equal(fs.statSync(parent).mode & 0o777, 0o700);
      assert.equal(fs.statSync(path.dirname(parent)).mode & 0o777, 0o700);
    }
    return originalWrite.call(this, descriptor, ...args);
  };
  try {
    writeJson(target, { synthetic: "access-and-refresh" }, false);
    assert.equal(observed, true);
    assert.equal(fs.statSync(target).mode & 0o777, 0o600);
  } finally { fs.writeFileSync = originalWrite; process.umask(previousUmask); fs.rmSync(directory, { recursive: true }); }
});

test("rewrites preserve stricter 0400 files and directory protection preserves 0500", () => {
  const directory = makeTempDir(), target = path.join(directory, "auth.json"), restricted = path.join(directory, "restricted");
  fs.writeFileSync(target, "old", { mode: 0o400 });
  fs.mkdirSync(restricted, { mode: 0o500 });
  try {
    writeJson(target, { synthetic: "replacement" }, false);
    assert.equal(fs.statSync(target).mode & 0o777, 0o400);
    assert.deepEqual(JSON.parse(fs.readFileSync(target, "utf8")), { synthetic: "replacement" });
    ensureDir(restricted, false);
    assert.equal(fs.statSync(restricted).mode & 0o777, 0o500);
  } finally { fs.chmodSync(restricted, 0o700); fs.rmSync(directory, { recursive: true }); }
});

test("protection strengthens an unchanged existing store without replacing its inode", () => {
  const directory = makeTempDir(), target = path.join(directory, "auth.json");
  fs.chmodSync(directory, 0o777); fs.writeFileSync(target, "synthetic-only", { mode: 0o644 });
  const original = fs.statSync(target);
  try {
    protectFile(target, false);
    assert.equal(fs.statSync(directory).mode & 0o777, 0o700);
    assert.equal(fs.statSync(target).mode & 0o777, 0o600);
    assert.equal(fs.statSync(target).ino, original.ino);
    assert.equal(fs.readFileSync(target, "utf8"), "synthetic-only");
  } finally { fs.rmSync(directory, { recursive: true }); }
});

test("a 0500 parent stays restrictive when an update is refused", (context) => {
  if (process.getuid?.() === 0) return context.skip("root bypasses ordinary filesystem write permissions");
  const directory = makeTempDir(), target = path.join(directory, "auth.json");
  fs.writeFileSync(target, "old-synthetic-value", { mode: 0o400 }); fs.chmodSync(directory, 0o500);
  try {
    assert.throws(() => writeJson(target, { synthetic: "replacement" }, false), { code: "EACCES" });
    assert.equal(fs.statSync(directory).mode & 0o777, 0o500);
    assert.equal(fs.statSync(target).mode & 0o777, 0o400);
    assert.equal(fs.readFileSync(target, "utf8"), "old-synthetic-value");
    assert.deepEqual(fs.readdirSync(directory), ["auth.json"]);
  } finally { fs.chmodSync(directory, 0o700); fs.rmSync(directory, { recursive: true }); }
});

test("multiply linked destinations are refused without changing shared content or mode", () => {
  const directory = makeTempDir(), target = path.join(directory, "auth.json"), other = path.join(directory, "other.json");
  fs.writeFileSync(target, "shared-synthetic-value", { mode: 0o644 }); fs.linkSync(target, other);
  try {
    assert.throws(() => protectFile(target, false), /one link/);
    assert.throws(() => writeJson(target, { synthetic: true }, false), /one link/);
    assert.equal(fs.readFileSync(other, "utf8"), "shared-synthetic-value");
    assert.equal(fs.statSync(other).mode & 0o777, 0o644);
  } finally { fs.rmSync(directory, { recursive: true }); }
});

test("direct and intermediate directory symlinks never receive mkdir, chmod or bytes", () => {
  const directory = makeTempDir(), outside = makeTempDir(), link = path.join(directory, "linked");
  fs.chmodSync(outside, 0o755); fs.symlinkSync(outside, link);
  try {
    for (const target of [path.join(link, "auth.json"), path.join(link, "nested", "auth.json")]) {
      assert.throws(() => writeJson(target, { synthetic: true }, false), /symlink/);
      assert.throws(() => protectFile(target, false), /symlink/);
    }
    assert.deepEqual(fs.readdirSync(outside), []);
    assert.equal(fs.statSync(outside).mode & 0o777, 0o755);
    const dangling = path.join(directory, "dangling");
    fs.symlinkSync(path.join(outside, "absent"), dangling);
    assert.throws(() => ensureDir(path.join(dangling, "nested"), false), /symlink/);
    assert.equal(fs.existsSync(path.join(outside, "absent")), false);
  } finally { fs.rmSync(directory, { recursive: true }); fs.rmSync(outside, { recursive: true }); }
});

for (const operation of ["writeFileSync", "fsyncSync", "renameSync"]) {
  test(`${operation} failure retains the original and removes only the owned temporary`, () => {
    const directory = makeTempDir(), target = path.join(directory, "auth.json");
    fs.writeFileSync(target, "old-synthetic-value", { mode: 0o600 });
    const original = fs[operation];
    fs[operation] = function (...args) {
      if (operation === "writeFileSync") original.call(this, args[0], "partial-synthetic-value");
      throw new Error("injected synthetic failure");
    };
    try {
      assert.throws(() => writeJson(target, { synthetic: "new" }, false), /injected/);
      assert.equal(fs.readFileSync(target, "utf8"), "old-synthetic-value");
      assert.deepEqual(fs.readdirSync(directory), ["auth.json"]);
    } finally { fs[operation] = original; fs.rmSync(directory, { recursive: true }); }
  });
}

test("exclusive-open collision does not unlink an unowned temporary pathname", () => {
  const directory = makeTempDir(), target = path.join(directory, "auth.json"), originalOpen = fs.openSync;
  let collision;
  fs.openSync = function (name, flags, ...rest) {
    if (flags & fs.constants.O_EXCL) {
      collision = name;
      fs.writeFileSync(name, "other-writer-synthetic-value", { mode: 0o600 });
    }
    return originalOpen.call(this, name, flags, ...rest);
  };
  try {
    assert.throws(() => writeJson(target, { synthetic: true }, false), { code: "EEXIST" });
    assert.equal(fs.readFileSync(collision, "utf8"), "other-writer-synthetic-value");
    assert.equal(fs.existsSync(target), false);
  } finally { fs.openSync = originalOpen; fs.rmSync(directory, { recursive: true }); }
});

test("protected backups use the same atomic private writer", () => {
  const directory = makeTempDir(), source = path.join(directory, "source.json"), backup = path.join(directory, "backups", "config.bak");
  fs.writeFileSync(source, "synthetic-config", { mode: 0o600 });
  try {
    copyFile(source, backup, false);
    assert.equal(fs.readFileSync(backup, "utf8"), "synthetic-config");
    assert.equal(fs.statSync(backup).mode & 0o777, 0o600);
    assert.equal(fs.statSync(path.dirname(backup)).mode & 0o777, 0o700);
  } finally { fs.rmSync(directory, { recursive: true }); }
});

test("dry-run creates no directories and leaves existing bytes and modes alone", () => {
  const directory = makeTempDir(), target = path.join(directory, "auth.json");
  fs.chmodSync(directory, 0o755); fs.writeFileSync(target, "synthetic-only", { mode: 0o644 });
  try {
    protectFile(target, true); writeJson(target, { synthetic: "replacement" }, true);
    ensureDir(path.join(directory, "absent"), true); writeJson(path.join(directory, "missing", "new.json"), {}, true);
    assert.equal(fs.statSync(directory).mode & 0o777, 0o755);
    assert.equal(fs.statSync(target).mode & 0o777, 0o644);
    assert.equal(fs.readFileSync(target, "utf8"), "synthetic-only");
    assert.deepEqual(fs.readdirSync(directory), ["auth.json"]);
  } finally { fs.rmSync(directory, { recursive: true }); }
});
