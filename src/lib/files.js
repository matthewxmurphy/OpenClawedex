// Copyright (c) 2026 Matthew X Murphy — https://MatthewxMurphy.com
// Product: https://builtnotbegged.com — SPDX-License-Identifier: MIT
"use strict";

const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

/**
 * OpenClawedex
 * Built for Matthew X. Murphy.
 *
 * Filesystem behavior is where configuration work goes wrong fastest:
 * stale backups, missing parent directories, or silent JSON parse failures.
 * These helpers keep the file semantics explicit and testable.
 */

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readJsonIfExists(filePath) {
  if (!exists(filePath)) return null;
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = fs.readFileSync(filePath, "utf8");
    try {
      return JSON.parse(raw);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Invalid JSON in ${filePath}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

function ensureDir(dirPath, dryRun) {
  if (dryRun) return;
  // Inspect every component before descending: recursive mkdir follows an
  // intermediate symlink, even when the final directory itself is not a link.
  const absolute = path.resolve(dirPath);
  let current = path.parse(absolute).root;
  for (const component of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let stat;
    try { stat = fs.lstatSync(current); }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      try { fs.mkdirSync(current, { mode: 0o700 }); }
      catch (mkdirError) { if (mkdirError.code !== "EEXIST") throw mkdirError; }
      stat = fs.lstatSync(current);
    }
    if (stat.isSymbolicLink()) throw new Error("Private directory cannot be a symlink");
    if (!stat.isDirectory()) throw new Error("Private directory must be a directory");
    if (current === absolute) {
      const descriptor = fs.openSync(current, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
      try {
        const opened = fs.fstatSync(descriptor);
        if (opened.dev !== stat.dev || opened.ino !== stat.ino) throw new Error("Private directory changed while opening");
        fs.fchmodSync(descriptor, opened.mode & 0o700);
      } finally { fs.closeSync(descriptor); }
    }
  }
}

function privateFileState(filePath) {
  let stat;
  try { stat = fs.lstatSync(filePath); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (stat && stat.isSymbolicLink()) throw new Error("Private file cannot be a symlink");
  if (stat && (!stat.isFile() || stat.nlink !== 1)) throw new Error("Private file must be a regular file with one link");
  return stat;
}

// Matching contents still need protection. This changes only the managed
// destination, never an external source-auth path supplied by the operator.
function protectFile(filePath, dryRun) {
  if (dryRun) return;
  ensureDir(path.dirname(filePath), false);
  const stat = privateFileState(filePath);
  if (!stat) return;
  const descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const opened = fs.fstatSync(descriptor);
    if (opened.dev !== stat.dev || opened.ino !== stat.ino) throw new Error("Private file changed while opening");
    fs.fchmodSync(descriptor, opened.mode & 0o600);
  } finally { fs.closeSync(descriptor); }
}

function setMode(filePath, mode, dryRun) {
  if (dryRun) return;
  fs.chmodSync(filePath, mode);
}

function copyFile(sourcePath, destinationPath, dryRun) {
  if (dryRun) return;
  writeFile(destinationPath, fs.readFileSync(sourcePath), false);
}

function writeFile(filePath, contents, dryRun) {
  if (dryRun) return;
  // OAuth stores and OpenClaw config may contain credentials. Protect the new
  // inode before writing bytes; chmod after rename would leave an exposure window.
  ensureDir(path.dirname(filePath), false);
  const existing = privateFileState(filePath);
  const mode = existing ? existing.mode & 0o600 : 0o600;
  const tempPath = `${filePath}.tmp-${randomUUID()}`;
  let descriptor;
  let ownsTemp = false;
  try {
    descriptor = fs.openSync(tempPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    ownsTemp = true;
    fs.fchmodSync(descriptor, mode);
    fs.writeFileSync(descriptor, contents);
    fs.fsyncSync(descriptor);
    const completed = descriptor;
    descriptor = undefined;
    fs.closeSync(completed);
    fs.renameSync(tempPath, filePath);
    ownsTemp = false;
  } finally {
    try { if (descriptor !== undefined) fs.closeSync(descriptor); }
    finally { if (ownsTemp) fs.unlinkSync(tempPath); }
  }
}

function readFile(filePath) {
  return fs.readFileSync(filePath);
}

function writeJson(filePath, value, dryRun) {
  writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, dryRun);
}

function compareFiles(leftPath, rightPath) {
  if (!exists(leftPath) || !exists(rightPath)) return false;
  return readFile(leftPath).compare(readFile(rightPath)) === 0;
}

function buildBackupPath(filePath) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${filePath}.bak.openclawedex-${stamp}`;
}

function fileName(filePath) {
  return path.basename(filePath);
}

module.exports = {
  buildBackupPath,
  compareFiles,
  copyFile,
  ensureDir,
  exists,
  fileName,
  protectFile,
  readFile,
  readJsonIfExists,
  setMode,
  writeFile,
  writeJson,
};
