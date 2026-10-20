# Remaining work for an end-to-end launch

Repository audit updated: 20 October 2026. The responsive public site, local admin, rich writing, images/covers, spreadsheet attachments, and résumé/certification workflow are implemented. The combined Cloudflare Workers adapter and a GitHub Actions preview deployment job are now configured; the job requires GitHub environment credentials and has not deployed from CI yet. The worktree includes pre-existing private profile edits and uploaded PDFs that remain uncommitted. This checklist separates a static public release from the requested combined Supabase site and admin release.

## Required for the current static-site release

| Order | Work | Current evidence | Completion condition |
| --- | --- | --- | --- |
| 1 | Finish and approve the real profile and contact information | `profile.json` is marked approved and the release check passes its profile gate. The generic `Financial Portfolio` title remains; fake contact links and test certifications were removed on 20 October. | Review the generic “Financial Portfolio” title and saved contact email before publication. Test contact links and certifications were cleared; the résumé remains visible. |
| 2 | Publish the actual launch research | All local research notes were removed during the 20 October demo-content cleanup. The site needs reviewed research before release; the release check currently has no published notes to serve. | Add and review actual research before publication. Showcase sample notes remain cleared per the owner’s request. |
| 3 | Put source and private content under recoverable version control | Source implementation is committed locally as `499a735`. Pushing `develop` failed because this environment could not resolve `github.com`; the separate private profile edits and uploaded PDFs remain uncommitted. Off-device content backup is unverified. | Push the reviewed source commit when network access is available; verify a content backup and restore, and keep an off-device copy. |
| 4 | Run the existing CI on the real repository | Local checks passed for the combined implementation. Remote CI has not run because the commit could not be pushed. | Push the reviewed commit and verify content validation, lint, types, unit tests and public/admin browser checks in repository CI. |
| 5 | Configure and verify the Cloudflare host/domain | The Workers adapter builds locally. GitHub Actions is configured to deploy the preview Worker from successful pushes to `develop`, but the GitHub `cloudflare-preview` environment credentials and remote preview have not yet been verified. `SITE_URL` for production remains unset. | Add the Cloudflare token and account ID to the GitHub environment, configure runtime secrets in Cloudflare, push to `develop`, and verify the preview URL. Set a production HTTPS `SITE_URL` only when selecting the production domain. |
| 6 | Verify the real deployment and devices | Automated browser, responsive and accessibility checks passed locally; real-phone and manual screen-reader evidence is still open. | Check direct URLs/refresh/404s, fonts/images/downloads, contact links, canonical/social metadata, sitemap/robots and production exclusion of drafts/samples. Test real iPhone/Android scrolling, image paste/crop, Back to top, zoom, keyboard and screen-reader journeys. See `plans/ACCEPTANCE.md`. |
| 7 | Confirm the publishing and rollback workflow | Local readiness checks and the Cloudflare preview CI/CD job are configured; hosted deployment and rollback have not been verified. Production deployment remains a manual release decision. | Demonstrate local edit → validation → hosted preview → reviewed production release; keep a last known-good artifact and verify redeployment/rollback. Refresh the same three showcase notes after each CR. |

The profile gate passes, but no research note currently exists and production release requires reviewed published research. A real HTTPS `SITE_URL` remains a technical blocker; source control, deployment and live checks remain open.

## Required for the requested combined Supabase site and admin

| Work | Current evidence | Completion condition |
| --- | --- | --- |
| Apply cloud schema and import content | All four migrations are recorded as applied to the linked Supabase project. The profile and five media objects imported successfully on 20 October; there were zero research notes. The five portfolio tables are visible in the SQL Editor. | Verify the imported profile and Storage objects through the API, then continue with hosted admin identity and preview checks. |
| Establish hosted admin identity and recovery | The fixed account slots and remote tables are ready; Auth users have not yet been bound. `RESEND_FROM_EMAIL` is not configured for delivery. | Create the two Supabase Auth users matching `ADMIN_ONE_EMAIL` and `ADMIN_TWO_EMAIL`, run the binding dry run, then apply the binding. Configure verified mail delivery and test sign-in, reset, email change, disabling and session revocation on a protected hosted preview. |
| Deploy one server for public and admin | The Vinext Cloudflare Worker adapter builds locally and the preview deployment workflow is configured, but no hosted Worker smoke test or production domain has been verified. `web/vercel.json` remains the static export configuration. | Configure the GitHub deployment environment and Cloudflare runtime secrets, deploy the Worker preview, and verify public and protected admin routes plus uploads and PDF visibility. Select the production domain after preview verification. |
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
