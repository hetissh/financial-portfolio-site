# Portfolio development routine

After every change request (CR) that changes the site or admin:

1. Keep the same three sample showcase notes current: `showcase-formatting`, `showcase-images`, and `showcase-workflow` (reserved IDs `qa-formatting`, `qa-images`, `qa-workflow`). Update the examples and checklists in `web/src/lib/showcase-notes.ts` to cover the change.
2. In `web/`, run `npm run showcase:update -- "A short description of this CR"`. It updates those three notes and their managed illustration assets. Keep their status `sample`; do not publish them or create more testing notes. Preserve all personal notes, profile settings and uploaded assets.
3. Run content validation, lint, type checking, unit tests and browser checks appropriate to the change. Verify the three notes in the rebuilt preview. Record actual results in `docs/qa-evidence/SHOWCASE_NOTES.md`.
4. Review changes for unintended content edits before handing them back. If a reserved ID, slug or illustration conflicts with user content, resolve the collision without overwriting it.

Read `web/AGENTS.md` before changing Next.js code. The showcase notes demonstrate expected behavior; automated tests remain the evidence for checks that cannot be demonstrated by saved content.
