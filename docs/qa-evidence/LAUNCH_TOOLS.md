# Local launch preparation — 28 September 2026

The owner requested deployment remain pending and all existing notes remain samples. This CR adds shared admin/CLI release checks, verified local content backups and new-folder recovery, separate admin source type checking, and separate public/admin browser artifact folders.

## Commands (from web/)

- `npm run release:check`: read-only content/asset validation and all production blockers. Exit 1 means blocked/invalid, exit 0 means content and address pass. It does not deploy.
- `npm run content:backup`: snapshot `src/content`, `public` and local `.admin-trash`, with SHA-256 file checksums and sizes. It prints the backup path.
- `npm run content:restore -- BACKUP NEW-FOLDER`: verify the complete snapshot, then write only into a new recovery folder outside working content/public/trash. Compare recovered files before manually recovering anything.
- `npm run typecheck:admin`: check all application/admin source without mixing public and admin generated route helpers.

Backups/recovery folders, generated exports, browser artifacts and machine-specific editor settings are ignored by Git. Snapshots are outside the static export. Retain an off-device copy; local snapshots cannot protect against losing the development machine.

## Validation

Content validation, lint, public type checking, isolated admin source type checking, and 68 unit tests passed. Unit coverage includes release blockers, optional citations/contact, URL credentials/path/query validation, original-image/workbook recovery, checksum corruption, path traversal, duplicate manifest paths, symlinks, refusal to overwrite/restore beneath public, and refusal to mark changing content as a complete snapshot.

The new Release panel passed three browser engines, including accessibility and 320/390/1440px widths. All three maintained showcase notes passed five desktop/mobile browser projects. A 26-file snapshot was restored and verified in the temporary checkout. Full regressions passed: 34 admin checks (2 native-clipboard engine skips) and 76 public checks (4 touch-engine skips). The public/admin output folders are separate; they ran concurrently successfully after fixing a trace-file collision. A duplicate release action label was clarified, and the formatting test now verifies a collapsed caret after link-dialog navigation before typing. Installed checks are recorded below.

## Work still pending

Real profile/contact copy and approval; reviewed published research; chosen remote repository and off-device backup; CI on that remote; hosting/domain/deployment; real-device/screen-reader/production smoke checks and a hosted rollback exercise. Local tooling does not complete those owner/external steps. See `../LAUNCH_CHECKLIST.md`.

## Installed verification

The actual project preview was rebuilt and all three notes show this CR. The live local admin shows all three current release blockers with working actions and no overflow; static preview returns 404 for admin and snapshot URLs. No browser runtime errors occurred.

The real-project release check returned exit 1 with exactly three expected blockers: unapproved profile, missing production origin and no published notes. All seven existing notes remain samples. A production preflight and full release export passed with temporary approved/citation-free content in the isolated checkout, excluded samples/admin, and restored those fixtures byte for byte.

The actual 26-file backup and recovery were compared byte for byte, including private originals, workbooks, public assets and local trash. The snapshot lives at `web/.content-backups/2026-09-27T22-59-32-989Z-c184fd19/`; recovery is `web/.content-restores/launch-check-20260928/`. Working files were never overwritten. Baseline hash checks preserve the profile, personal research and uploaded assets, apart from the three routine-managed sample-note updates.

The reviewed local source checkpoint covers the checked-in application and documentation. Next.js-generated `next-env.d.ts`, snapshots, caches, browser output and machine editor settings are excluded. No remote has been connected and no files have been pushed or deployed. Remote CI, an off-device backup and hosted rollback remain pending.
