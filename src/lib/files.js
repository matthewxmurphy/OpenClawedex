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
  fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(dirPath).isSymbolicLink()) throw new Error("Private directory cannot be a symlink");
  fs.chmodSync(dirPath, 0o700);
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
  let existing;
  try { existing = fs.lstatSync(filePath); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (existing && existing.isSymbolicLink()) {
    throw new Error("Private file cannot be a symlink");
  }
  const tempPath = `${filePath}.tmp-${randomUUID()}`;
  let descriptor;
  try {
    descriptor = fs.openSync(tempPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    fs.writeFileSync(descriptor, contents);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(tempPath, filePath);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
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
  readFile,
  readJsonIfExists,
  setMode,
  writeFile,
  writeJson,
};
