"use strict";

const fs = require("fs");
const path = require("path");

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
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath, dryRun) {
  if (dryRun) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

function setMode(filePath, mode, dryRun) {
  if (dryRun) return;
  fs.chmodSync(filePath, mode);
}

function copyFile(sourcePath, destinationPath, dryRun) {
  if (dryRun) return;
  fs.copyFileSync(sourcePath, destinationPath);
}

function writeFile(filePath, contents, dryRun) {
  if (dryRun) return;
  fs.writeFileSync(filePath, contents);
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
