# Release and rollback

Current status: implemented local preview. No remote repository, hosting project, domain, or public deployment has been created.

## Finish the content

1. Update `web/src/content/profile.json` with the correct name, headline, bio and contact links. In Admin → Profile, tick **Approved for release** and save only after reviewing the profile (this sets `isPlaceholder` to `false`).
2. Add actual research as `published`. Citations/source links are optional, including in production; supplied sources still need a title and a valid HTTPS address. Keep unfinished notes as `draft`. The provided `sample` notes are excluded from production automatically.
3. Use the local admin’s **Sheets & models** section to attach real Excel workbooks or Google Sheets links. Builds export workbook downloads only for visible research, and remove obsolete generated downloads.
4. Use the profile editor for About and Contact copy. Set the Contact email to enable the email link; it opens the visitor’s email app. See [rich content editing](qa-evidence/RICH_CONTENT.md) for article formatting and images.
5. Add any real résumé/research downloads to `web/public/downloads/` and reference them with root-relative paths. Do not put private files into `public/`.
6. Complete the real-phone and screen-reader checks in `plans/ACCEPTANCE.md`.

## Read-only release check

From `web/`, run `npm run release:check`. This validates content/assets and reports all production blockers together: profile approval, published research and the HTTPS origin. Exit code `1` means blocked or invalid content; `0` means the content/address checks pass. It does not save, approve, publish or deploy anything. To check a chosen domain, use `SITE_URL=https://YOUR-REAL-DOMAIN npm run release:check`.

The local admin's Release panel uses the same checks. `SITE_URL` must be present when the admin server starts to show an approved address there; restart the admin after changing that environment variable. Contact email/links are a notice and citations remain optional. Source links supplied by the author are still validated.

## Verified backup and recovery

Stop editing in the local admin while taking a snapshot. From `web/`:

```sh
npm run content:backup
npm run content:restore -- /absolute/path/to/BACKUP /absolute/path/to/NEW-recovery-folder
```

Backup prints a timestamped path under `web/.content-backups/`. It includes `src/content/` (profile, research, original/cropped images and workbooks), `public/` (including custom résumé/download files), and `.admin-trash/` when present. SHA-256 checksums and sizes are stored in `manifest.json` and verified after creation. A backup that detects edits during copying has no complete manifest and must be retried.

Recovery verifies the manifest and every file before creating a **new** destination; existing folders, corrupt files, unsafe paths and symlinks are refused. The recovery folder has `src/content/`, `public/` and optional `.admin-trash/`. Compare recovered files before manually copying anything back to the working project; the command never merges into or overwrites it. The recovery destination is also refused under this app’s working content, public or trash directories. Snapshots and `.content-restores/` are ignored by Git and stay outside the static export. Keep a second copy off the development device. These snapshots do not replace source-control backups or a known-good release artifact.

## Build the release

Stop the local admin, then run from `web/` after loading Node from `.nvmrc`:

```sh
npm ci
npm run lint
npm run typecheck
npm run typecheck:admin
npm run test:unit
SITE_URL=https://YOUR-REAL-DOMAIN npm run release:check
SITE_URL=https://YOUR-REAL-DOMAIN npm run build:release
npm run preview
```

Replace the domain with your actual HTTPS origin. The production build rejects placeholder profiles, missing publication data, and invalid origins. It exports only published notes, generates the production sitemap/canonical URLs, and enables indexing. The export has no runtime admin API or secret to configure. Admin routes and private workbook sources are excluded.

Preview builds use `npm run build` and remain non-indexable. `noindex` and `robots.txt` are not access controls; use a protected host preview if content needs to remain private.

## Hosting configuration

Suggested host: Vercel, as in the plan. Use project root `web`, Node 24, the checked-in configuration, and a `SITE_URL` matching the intended production origin. `vercel.json` uses `npm run build:release` and the `out` directory. It deliberately will not publish the current placeholder profile.

A generic static host can also serve the generated `out/` directory. Configure directory indexes, trailing-slash redirects, and a real 404 response. Do not use a catch-all SPA rewrite to the home page.

Before production: verify a protected preview's home, direct research URLs, refresh, 404 status, fonts, images, source/download links, phone scrolling, and three successive Back to top activations. Configure HTTPS and check metadata/canonical URLs on the real origin. The owner must choose the hosting account and domain before this step.

## Rollback

Keep the previous static artifact and its corresponding source commit before publishing a new release. Re-deploy that exact artifact (or rebuild the recorded commit with its lockfile and production origin), then repeat the production smoke checks. Do not reset or rewrite Git history to perform a deployment rollback.

## Maintenance

Edit content → validate → build → review preview → publish. Review dead links and outdated research periodically. Update dependencies in a separate change and run the same tests. The provided CI runs the preview dataset; adapt content-specific E2E expectations if replacing the sample records. No recurring automation was created.

## Local content recovery

Reset edits restores unsaved form changes to the last saved version. It does not undo a saved edit. Recover saved content from your source commit or backup. Removed research JSON is kept in `web/.admin-trash/`; restore it into `src/content/research/` only after checking that its ID and slug are unique. Preserve `src/content/workbooks/` alongside research JSON. Restore a renamed note by renaming its JSON file and updating its slug together, then validate and rebuild.

Current launch inventory: [remaining end-to-end work](LAUNCH_CHECKLIST.md).
