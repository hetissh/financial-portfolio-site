# Remaining work for an end-to-end launch

Repository audit updated: 20 October 2026. The responsive public site, local admin, rich writing, images/covers, spreadsheet attachments, and résumé/certification workflow are implemented. This checklist separates a static public release from the requested combined Supabase site and admin release.

## Required for the current static-site release

| Order | Work | Current evidence | Completion condition |
| --- | --- | --- | --- |
| 1 | Finish and approve the real profile and contact information | `profile.json` is marked approved and the release check passes its profile gate, but the visible profile still has `Financial Portfolio`, `test cert 1/2`, and sample/test contact URLs. | Replace or intentionally approve the actual name, links, résumé and certification details before publication. |
| 2 | Publish the actual launch research | One note is `published`; six are `sample`. The published note still describes itself as an example, contains `dlkjfg;lkasdjg`, and links example financial statements. | Replace the exercise with reviewed research or return it to draft/sample until the actual launch note is ready. Keep the three showcase notes as samples; they are excluded from production. |
| 3 | Put source and private content under recoverable version control | The local `develop` checkout has 76 modified and 49 untracked paths; these changes are not in the current Git commit or its tracked remote branch. Off-device content backup is unverified. | Review and commit the intended source changes without secrets or private uploads; verify a content backup and restore, and keep an off-device copy. |
| 4 | Run the existing CI on the real repository | Local checks passed for the combined implementation, but remote CI has not verified the current uncommitted changes. | Run the repository CI on the reviewed commit and verify content validation, lint, types, unit tests and public/admin browser checks. |
| 5 | Choose and configure the production host/domain | `SITE_URL` is unset, so the read-only release check blocks the production build. The checked-in Vercel configuration is for a static export, not the requested cloud-backed admin. | Select a host and HTTPS domain, configure the real production origin, then build and verify the chosen deployment mode. |
| 6 | Verify the real deployment and devices | Automated browser, responsive and accessibility checks passed locally; real-phone and manual screen-reader evidence is still open. | Check direct URLs/refresh/404s, fonts/images/downloads, contact links, canonical/social metadata, sitemap/robots and production exclusion of drafts/samples. Test real iPhone/Android scrolling, image paste/crop, Back to top, zoom, keyboard and screen-reader journeys. See `plans/ACCEPTANCE.md`. |
| 7 | Confirm the publishing and rollback workflow | Shared admin/CLI readiness checks, verified content snapshots/recovery and build/rollback instructions exist; no live rollback exercise has been performed. | Demonstrate local edit → validation → preview → reviewed release; keep a last known-good artifact and verify redeployment/rollback. Refresh the same three showcase notes after each CR. |

The profile and published-note checks pass only their machine-readable flags; visible sample content still makes editorial review a blocker. A real HTTPS `SITE_URL` remains a technical blocker; source control, deployment and live checks remain open.

## Required for the requested combined Supabase site and admin

| Work | Current evidence | Completion condition |
| --- | --- | --- |
| Apply cloud schema and import content | The configured Supabase project's `portfolio_profile` REST query returned `PGRST205` on 20 October: the table does not exist. The import has only been dry-run locally. | Apply all four reviewed migrations, import the approved profile, notes and media, and reconcile counts and file access. |
| Establish hosted admin identity and recovery | The fixed account slots are defined locally; remote tables and Auth bindings are not ready. `RESEND_FROM_EMAIL` is unset locally. | Create and bind both Supabase Auth users, configure verified mail delivery, and test sign-in, reset, email change, disabling and session revocation on a protected hosted preview. |
| Deploy one server for public and admin | `build:cloud` passed locally, but no server host, adapter or production domain has been configured. `web/vercel.json` still builds a static export. | Configure the selected server host with HTTPS, cloud keys and `ADMIN_ORIGIN`; deploy one server and verify public and protected admin routes plus uploads and PDF visibility. |
| Rehearse cutover and rollback | No live migration, hosted browser journey, domain switch or rollback exercise has been completed. | Freeze local edits for the final import, test the hosted preview, retain a known-good artifact and demonstrate rollback before switching visitors. |

## Additional features to decide on

These are optional beyond the requested combined site and admin release:

- **Email sent directly from the site:** a contact form, server/provider integration, delivery handling and spam controls. The current email link opens the visitor's email app with the saved recipient and subject; the profile email needs to be supplied.
- **Guided releases in admin:** add a guided build/release action to the shared profile/publication/domain checks. The existing release process is documented CLI work.
- **Saved version history and in-app trash restore:** current reset restores unsaved changes; saved versions need Git/backups and deleted notes can be restored from the local trash files.
- **Larger-library discovery and operations:** research search/tag filters, analytics or uptime monitoring if wanted. Search/filtering was excluded from the initial small-collection scope. These need a separate feature request.

No hosting account, domain, repository or third-party service was inspected remotely in this audit; external provisioning must be confirmed during launch.

## This local preparation

The original 28 September preparation left deployment pending and all notes as samples. Since then, the profile was marked approved and one note was published. The CLI (`npm run release:check`) and admin share the content/address checks; missing contact options are a notice, not an additional release guard. Content backup/restoration is implemented locally, but the current content still needs an off-device backup and hosted recovery exercise. Earlier local evidence is recorded in `docs/qa-evidence/LAUNCH_TOOLS.md`.
