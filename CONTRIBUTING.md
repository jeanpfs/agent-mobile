# Contributing to agent-mobi

Thanks for your interest in improving agent-mobi.

## Project scope

agent-mobi is a thin, deterministic CLI wrapper over [Maestro](https://maestro.mobile.dev/) for LLM-driven mobile automation. Pull requests that keep the surface small, the output text-friendly for LLMs, and behavior predictable are welcome. Complex features that could live in Maestro itself probably belong there.

## Prerequisites

- Node.js ≥ 18
- pnpm (the project uses `pnpm-lock.yaml`)
- [Maestro CLI](https://maestro.mobile.dev/) on your `PATH`
- An iOS Simulator or Android Emulator with a sample app running, if you want to test end-to-end

## Development setup

```bash
git clone https://github.com/jeanpfs/agent-mobi.git
cd agent-mobi
pnpm install
pnpm build
```

The built CLI lives at `dist/cli.js`. Link it globally to test changes:

```bash
pnpm link --global
agent-mobi --help
```

After each source change, run `pnpm build` — `tsup` rebuilds in milliseconds and the global link picks it up automatically.

## Architecture in one minute

- `src/cli.ts` — dispatches the subcommand to a handler.
- `src/commands/*.ts` — one file per subcommand (`snapshot`, `tap`, `type`, `scroll`, `screenshot`, `assert`, `logs`, `setup`).
- `src/utils.ts` — shared: shell execution, Maestro YAML flow runner, hierarchy parsing, ref assignment, snapshot cache (`/tmp/agent-mobi-snapshot.json`), structured error reporting.

All user-facing failures must go through `fail({ code, message, suggestion })` — don't throw raw errors. Any text written into generated Maestro YAML must go through `escapeYamlString()`.

## Running against a device

1. Boot a simulator/emulator with an app visible.
2. `node dist/cli.js setup` — should print `Status: READY`.
3. `node dist/cli.js snapshot` — prints the accessibility tree with refs.
4. Iterate with `tap`, `type`, `assert`, etc.

## Pull requests

- Keep changes focused — one logical change per PR.
- Update `README.md` if you change user-visible CLI behavior, and `SKILL.md` if you change guidance for LLM callers.
- Add a new error `code` rather than reusing an existing one when the cause is different; document it in the README error table.
- Run `pnpm build` locally; CI runs the same.
- Describe how you tested (iOS / Android / both).

## Reporting issues

Please include:
- `agent-mobi --version` (or commit SHA)
- Platform (iOS Simulator / Android Emulator), device name, OS version
- Output of `agent-mobi setup`
- The exact command you ran and the full error output
- Minimal reproduction steps

## Code style

- TypeScript strict, ESM only.
- No runtime dependencies — keep the CLI dependency-free.
- No comments unless the *why* is non-obvious; well-named identifiers should explain the *what*.
- Prefer dedicated helpers in `utils.ts` over duplicating logic across commands.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
