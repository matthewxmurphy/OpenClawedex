"use strict";

const { DEFAULT_MODEL } = require("../constants");
const { formatDoctor, printJson, printLines } = require("../formatting");
const { summarizeState } = require("../lib/state");

/**
 * OpenClawedex
 * Built for Matthew X. Murphy.
 *
 * Doctor is the operational summary command. It exists because "inspect" is a
 * raw state dump, while "doctor" answers the more useful question: what still
 * blocks a clean OpenAI Codex setup right now?
 */

function runDoctor(paths, args) {
  const summary = summarizeState(paths);
  const expectedModel = args.model || DEFAULT_MODEL;

  if (args.json) {
    printJson({
      ...summary,
      doctor: formatDoctor(summary, expectedModel),
    });
    return;
  }

  printLines(formatDoctor(summary, expectedModel));
}

module.exports = {
  runDoctor,
};
