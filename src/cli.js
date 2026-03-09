"use strict";

const { PROJECT_NAME, PROJECT_VERSION } = require("./constants");
const { resolvePaths } = require("./paths");
const { runInspect } = require("./commands/inspect");
const { runConfigure } = require("./commands/configure");
const { runDoctor } = require("./commands/doctor");

/**
 * OpenClawedex
 * Built for Matthew X. Murphy.
 *
 * The CLI stays dependency-free on purpose. This keeps the project easy to run
 * on stripped-down gateway boxes where adding a parser library is unnecessary
 * operational friction.
 */

function usage() {
  console.log(`${PROJECT_NAME}

Usage:
  openclawedex inspect [options]
  openclawedex configure [options]
  openclawedex doctor [options]
  openclawedex --version

Commands:
  inspect
    Read-only readiness summary for Codex + OpenClaw wiring.

  configure
    Sync auth.json, update model defaults, and write a backup of openclaw.json.

  doctor
    Produce a concise operational report of what is still blocking openai-codex.

Common options:
  --openclaw-home <path>   OpenClaw state dir (default: ~/.openclaw)
  --codex-home <path>      Codex state dir (default: ~/.codex)
  --codex-auth <path>      Source Codex auth.json
  --agent <id>             Agent id (default: main)
  --json                   Emit JSON instead of text
  --version                Print the current OpenClawedex version

Configure/doctor options:
  --model <ref>            Model ref (default: openai-codex/gpt-5.4)
  --transport <value>      Model transport hint (default: auto)
  --dry-run                Print what would change without writing files
`);
}

function version() {
  console.log(PROJECT_VERSION);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  if (argv.includes("-v") || argv.includes("--version")) {
    version();
    process.exit(0);
  }

  if (argv.length === 0 || argv.includes("-h") || argv.includes("--help")) {
    usage();
    process.exit(0);
  }

  const [command, ...rest] = argv;
  const args = { _: [] };

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return { command, args };
}

function main(argv) {
  const { command, args } = parseArgs(argv);
  const paths = resolvePaths(args);

  switch (command) {
    case "inspect":
      runInspect(paths, args);
      return;
    case "configure":
      runConfigure(paths, args);
      return;
    case "doctor":
      runDoctor(paths, args);
      return;
    default:
      fail(`Unknown command: ${command}`);
  }
}

module.exports = {
  main,
  parseArgs,
  version,
};
