#!/usr/bin/env node

"use strict";

// OpenClawedex
// Built for Matthew X. Murphy's OpenClaw + Codex workflow.
// This entrypoint stays intentionally small so the project logic lives in src/.

require("../src/cli").main(process.argv.slice(2));
