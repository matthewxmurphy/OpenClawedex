# Design Notes

## Why dependency-free Node

The target environment is often a live gateway box where the useful thing is
"run one file now" instead of "install a stack first".

Using built-in Node APIs keeps:

- bootstrap simple
- failure modes obvious
- tests lightweight
- remote execution easier

## Why this is a project and not a skill

Skills are a poor fit for this problem because the hard part is not agent
instructions. The hard part is:

- state discovery
- auth file placement
- provider auth presence
- model routing edits
- backup discipline

That belongs in a project with code, docs, examples, and tests.

## Why `doctor` exists

Operators usually want an answer to:

> "What is still wrong right now?"

`inspect` tells you raw state.
`doctor` tells you the blocking deltas.
