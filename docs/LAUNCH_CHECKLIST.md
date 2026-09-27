# Remaining work for an end-to-end launch

Repository audit: 28 September 2026. The responsive public site, local admin, rich writing, images/covers, spreadsheet attachments, editable About/Contact and test-note workflow are implemented. This checklist separates launch requirements from additional product features.

## Required for the current static-site release

| Order | Work | Current evidence | Completion condition |
| --- | --- | --- | --- |
| 1 | Finish and approve the real profile and contact information | `profile.json` still has `isPlaceholder: true`; no Contact email or contact links. No résumé is configured. | Review name, role, biography/About and Contact copy; add the desired email/links; tick **Approved for release** in Admin → Profile and save after review (this sets `isPlaceholder` to `false`). A résumé is optional. |
| 2 | Publish the actual launch research | Seven records are `sample`; zero are `published`. | At least one reviewed note is `published`, with real copy and intended images/sheets/downloads. Citations are optional. Keep the three showcase notes as samples; they are excluded from production. |
| 3 | Put source and private content under recoverable version control | A reviewed local source checkpoint is prepared for this hand-off; no remote is configured. The actual 26-file content snapshot and new-folder recovery were verified. | Record the reviewed local checkpoint, connect the owner's chosen repository, and back up `src/content` including original images and workbooks. Use `npm run content:backup` and `npm run content:restore -- BACKUP NEW-FOLDER` to verify a restore; keep an off-device copy. Avoid committing local caches, generated exports or secrets. |
| 4 | Run the existing CI on the real repository | `.github/workflows/ci.yml` exists but has not run remotely. | Install from the lockfile and pass validation, lint, type checking, unit/admin/public browser checks. Update content-specific example expectations when replacing samples, or run CI against a maintained fixture dataset. |
| 5 | Choose and configure the production host/domain | A static-host configuration exists; no local production environment file or real `SITE_URL` is configured. No deployment was created by this work. | Set `SITE_URL` to the chosen HTTPS origin, run `npm run build:release`, deploy the reviewed `out/` artifact and configure domain/HTTPS. The owner supplies the hosting account and domain. |
| 6 | Verify the real deployment and devices | Automated browser, responsive and accessibility checks passed locally; real-phone and manual screen-reader evidence is still open. | Check direct URLs/refresh/404s, fonts/images/downloads, contact links, canonical/social metadata, sitemap/robots and production exclusion of drafts/samples. Test real iPhone/Android scrolling, image paste/crop, Back to top, zoom, keyboard and screen-reader journeys. See `plans/ACCEPTANCE.md`. |
| 7 | Confirm the publishing and rollback workflow | Shared admin/CLI readiness checks, verified content snapshots/recovery and build/rollback instructions exist; no live rollback exercise has been performed. | Demonstrate local edit → validation → preview → reviewed release; keep a last known-good artifact and verify redeployment/rollback. Refresh the same three showcase notes after each CR. |

Production still requires an approved profile, at least one published note and a valid HTTPS `SITE_URL`. Making citations optional does not bypass those remaining checks. Source entries, when supplied, still require a title and a valid HTTPS URL.

## Additional features to decide on

These are not required by the current agreed local-admin/static-site design:

- **Admin from anywhere:** a hosted editor with sign-in, authorization, persistent content/media storage and a deployment workflow. The current `/admin` runs locally and is intentionally absent from the public export.
- **Email sent directly from the site:** a contact form, server/provider integration, delivery handling and spam controls. The current email link opens the visitor's email app with the saved recipient and subject; the profile email needs to be supplied.
- **Guided releases in admin:** add a guided build/release action to the shared profile/publication/domain checks. The existing release process is documented CLI work.
- **Saved version history and in-app trash restore:** current reset restores unsaved changes; saved versions need Git/backups and deleted notes can be restored from the local trash files.
- **Larger-library discovery and operations:** research search/tag filters, analytics or uptime monitoring if wanted. Search/filtering was excluded from the initial small-collection scope. These need a separate feature request.

No hosting account, domain, repository or third-party service was inspected remotely in this audit; external provisioning must be confirmed during launch.

## This local preparation

The owner asked to leave deployment pending and to keep all existing notes as samples. The CLI (`npm run release:check`) and admin now share a complete content/address checklist; missing contact options are a notice, not an additional release guard. Content backup/restoration is implemented and tested with file checksums, preserved original assets and refusal to overwrite existing folders. Source control and local verification evidence are recorded in `docs/qa-evidence/LAUNCH_TOOLS.md`. No existing content was approved or published.
