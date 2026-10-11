# Shared AI coding defaults

These six files are the relevant reusable standards from the attached
`ai-agent-global-and-project-rules` kit, kept inside the repository so Codex
and Claude Code can read the same rules without a machine-wide installation.
`engineering.md` applies generally. Use `testing.md` for verification,
`security.md` for inputs, files, APIs, and secrets, and the frontend, backend,
or TypeScript standard for work in those areas. The kit's Python rules were
not copied because this repository has no Python application code.

These are defaults. `AGENTS.md`, `docs/architecture.md`,
`docs/coding-standards.md`, and established implementation choices take
precedence. Keep the architecture and coding standards specific to this
repository; do not repeat the full shared rules in agent instruction files.
