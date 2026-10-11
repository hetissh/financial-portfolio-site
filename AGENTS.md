# Portfolio development routine

Before editing, read `README.md`, `docs/architecture.md`,
`docs/coding-standards.md`, and the relevant source and tests. Inspect an existing
implementation before adding another. The applicable shared defaults are in
`docs/ai-rules/` (`engineering.md` always; `testing.md` for verification;
`security.md` for inputs, files, APIs and secrets; `frontend.md`, `backend.md`,
and `typescript.md` when those areas are involved). This file and documented
project decisions take precedence over those defaults.

Make the smallest correct change. Reuse existing documentation instead of creating
an equivalent file under another name. Follow the purpose and reasoning comment
rule in `docs/coding-standards.md`, and run `npm run format:check` for maintained
web code. Keep `docs/architecture.md` current when a
change affects components, boundaries, data flow, persistence, integrations,
deployment, ownership, or failure/retry behavior. Keep
`docs/coding-standards.md` current when tooling, commands, conventions, runtime
targets, or deliberate deviations change. Do not edit either document for an
unrelated change. Run relevant checks and report what actually passed or was not
verified.

After every change request (CR) that changes the site or admin:

1. Keep the same three sample showcase notes current: `showcase-formatting`, `showcase-images`, and `showcase-workflow` (reserved IDs `qa-formatting`, `qa-images`, `qa-workflow`). Update the examples and checklists in `web/src/lib/showcase-notes.ts` to cover the change.
2. In `web/`, run `npm run showcase:update -- "A short description of this CR"`. It updates those three notes and their managed illustration assets. Keep their status `sample`; do not publish them or create more testing notes. Preserve all personal notes, profile settings and uploaded assets.
3. Run content validation, lint, type checking, unit tests and browser checks appropriate to the change. Verify the three notes in the rebuilt preview. Record actual results in `docs/qa-evidence/SHOWCASE_NOTES.md`.
4. Review changes for unintended content edits before handing them back. If a reserved ID, slug or illustration conflicts with user content, resolve the collision without overwriting it.

Read `web/AGENTS.md` before changing Next.js code. The showcase notes demonstrate expected behavior; automated tests remain the evidence for checks that cannot be demonstrated by saved content.
