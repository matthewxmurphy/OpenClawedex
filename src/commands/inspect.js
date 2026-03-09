"use strict";

const { formatInspect, printJson, printLines } = require("../formatting");
const { summarizeState } = require("../lib/state");

/**
 * OpenClawedex
 * Built for Matthew X. Murphy.
 *
 * Inspect is intentionally read-only. It is the safest command to run first on
 * any gateway because it tells you what OpenClaw sees before you mutate state.
 */

function runInspect(paths, args) {
  const summary = summarizeState(paths);
  if (args.json) {
    printJson(summary);
    return;
  }
  printLines(formatInspect(summary));
}

module.exports = {
  runInspect,
};
