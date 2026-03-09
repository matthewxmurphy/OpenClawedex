"use strict";

const { DEFAULT_MODEL, DEFAULT_TRANSPORT } = require("../constants");
const { formatConfigure, printJson, printLines } = require("../formatting");
const { configureState } = require("../lib/mutation");

/**
 * OpenClawedex
 * Built for Matthew X. Murphy.
 *
 * Configure is the command that actually mutates OpenClaw config. It keeps the
 * mutation narrow on purpose: model routing, transport hint, auth.json sync,
 * and a backup.
 */

function runConfigure(paths, args) {
  const result = configureState(paths, {
    agentId: paths.agentId,
    dryRun: Boolean(args["dry-run"]),
    model: args.model || DEFAULT_MODEL,
    transport: args.transport || DEFAULT_TRANSPORT,
  });

  if (args.json) {
    printJson(result);
    return;
  }

  printLines(formatConfigure(result, Boolean(args["dry-run"])));
}

module.exports = {
  runConfigure,
};
