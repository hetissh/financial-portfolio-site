# Release and rollback

Current status: implemented local preview with a configured `origin` Git remote.
This repository does not establish a hosting project, production domain, or public
deployment; confirm their external status before release.

## Finish the content

1. Update `web/src/content/profile.json` with the correct name, headline, bio and contact links. In Admin → Profile, tick **Approved for release** and save only after reviewing the profile (this sets `isPlaceholder` to `false`).
2. Add actual research as `published`. Citations/source links are optional, including in production; supplied sources still need a title and a valid HTTPS address. Keep unfinished notes as `draft`. The provided `sample` notes are excluded from production automatically.
3. Use the local admin’s **Sheets & models** section to attach real Excel workbooks or Google Sheets links. Builds export workbook downloads only for visible research, and remove obsolete generated downloads.
4. Use the profile editor for About and Contact copy. Set the Contact email to enable the email link; it opens the visitor’s email app. See [rich content editing](qa-evidence/RICH_CONTENT.md) for article formatting and images.
5. Upload a PDF résumé in Admin → Profile and enable its public link when ready. The build copies only the selected upload into `web/public/downloads/resumes/`. Manually supplied public résumé/research downloads can still use root-relative paths. Do not put private files into `public/`.
6. Complete the real-phone and screen-reader checks in `plans/ACCEPTANCE.md`.

## Read-only release check

From `web/`, run `npm run release:check`. This validates content/assets and reports all production blockers together: profile approval, published research and the HTTPS origin. Exit code `1` means blocked or invalid content; `0` means the content/address checks pass. It does not save, approve, publish or deploy anything. To check a chosen domain, use `SITE_URL=https://YOUR-REAL-DOMAIN npm run release:check`.

The local admin's Release panel uses the same checks. `SITE_URL` must be present when the admin server starts to show an approved address there; restart the admin after changing that environment variable. Contact email/links are a notice and citations remain optional. Source links supplied by the author are still validated.

## Admin account recovery and hosting

The admin now requires one of two fixed accounts. Bootstrap the private auth
JSON once with `npm run admin:bootstrap` and keep it outside source content,
public assets, Git, and the content backup. Use a separate protected backup for
this file; losing it means the passwords and current recovery addresses are
lost. `ADMIN_ORIGIN`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` must be set for
forgot-password and email confirmation. Verify the sender domain with Resend
and test delivery to both admin mailboxes before relying on recovery.

`npm run build:admin` and `npm run start:admin` can run the public site and
authenticated admin on one server. This is a separate deployment choice from
the checked-in Vercel static export. A combined server needs HTTPS, one writer,
and persistent writable storage for `PORTFOLIO_AUTH_FILE`, `src/content`, and
uploaded files. Set `SITE_MODE=production` and a valid production `SITE_URL`
only after release content is approved. Do not run this server against an
ephemeral or read-only filesystem; no hosted admin deployment is configured in
this repository.

## Verified backup and recovery

Stop editing in the local admin while taking a snapshot. From `web/`:

```sh
npm run content:backup
npm run content:restore -- /absolute/path/to/BACKUP /absolute/path/to/NEW-recovery-folder
```

Backup prints a timestamped path under `web/.content-backups/`. It includes `src/content/` (profile, research, original/cropped images, workbooks and uploaded résumé sources), `public/` (including visible/generated and custom downloads), and `.admin-trash/` when present. SHA-256 checksums and sizes are stored in `manifest.json` and verified after creation. A backup that detects edits during copying has no complete manifest and must be retried.

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

### Supabase migration preparation

The combined cloud server implementation is ready for hosted verification. The
four reviewed migrations and initial content import were applied to the linked
Supabase project on 20 October 2026; the server deployment has not been cut over. `web/supabase/migrations/202610140001_portfolio.sql` defines the
initial database tables, public read policies, fixed admin slots, and Storage
buckets. `web/supabase/migrations/202610140002_admin_sessions.sql` adds private
revocable session storage. `202610190001_admin_content.sql` adds atomic trash
and notebook-order versioning, and `202610190002_admin_recovery.sql` adds
one-time recovery and email-change links. All four migrations are applied to the
linked project.
The import dry run reported one profile, zero research notes, and five media
objects. The explicit `npm run supabase:import -- --apply` command completed
successfully after all four migrations were applied. It compares existing data
and refuses to overwrite changed cloud rows or objects. Verify imported rows
and Storage objects through the dashboard before hosted testing.
Do not run this command against a project containing unrelated content.

`PORTFOLIO_DATA_SOURCE=supabase` selects cloud visitor, admin, upload, and
workbook-preview paths. `npm run build:cloud` creates one server for both the
site and admin; `npm run start:cloud` runs it. Keep the existing static
deployment until end-to-end checks against the migrated project pass.
Supabase Auth users must be invited and mapped to the two fixed slots; local
scrypt password hashes are not imported. Create the two users in Supabase
Authentication → Users, then run `npm run supabase:bind-admins` to check the
match against `ADMIN_ONE_EMAIL` and `ADMIN_TWO_EMAIL`. Only after reviewing the
dry run, add `-- --apply` to fill empty slot bindings. The binding script never
replaces an existing user ID. Supabase Auth email delivery requires a verified
Resend sender configured as custom SMTP. This preparation does not change the
current release procedure below.

For the cloud cutover, keep the current static deployment serving visitors.
The four migrations and initial import are complete; the imported content is one
profile, zero research notes, and five media objects. Verify the profile and
private media against local sources. Invite the two Auth users, bind them to
the fixed slots, and test sign-in, recovery, disabled access, profile edits,
research publication, image and workbook uploads, and résumé and certification
PDF visibility on a protected combined-server preview. Configure `SITE_URL`,
`ADMIN_ORIGIN`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, and Resend settings on the chosen server host. Build with
`npm run build:cloud`; start with `npm run start:cloud`. Switch the public domain
only after those checks pass, retain the static artifact for rollback, and
stop local file-backed edits during the final import to avoid diverging copies.

The existing `vercel.json` configures only the static export. Cloudflare Workers
is the combined server target. GitHub Actions checks the Worker build on pushes
and pull requests; after checks pass, pushes to `develop` deploy the preview
Response Store and site Worker. Configure the GitHub `cloudflare-preview`
environment with a Cloudflare API token and account ID, and configure the
application runtime secrets on the Worker. The pipeline deploys preview mode
only. Production deployment remains a manual release decision until the
production checklist and hosted admin, recovery, and upload checks pass. The
current production validation deliberately will not publish the placeholder
profile.

A generic static host can also serve the generated `out/` directory. Configure directory indexes, trailing-slash redirects, and a real 404 response. Do not use a catch-all SPA rewrite to the home page.

Before production: verify a protected preview's home, direct research URLs, refresh, 404 status, fonts, images, source/download links, phone scrolling, and three successive Back to top activations. Configure HTTPS and check metadata/canonical URLs on the real origin. The owner must choose the hosting account and domain before this step.

## Rollback

Keep the previous static artifact and its corresponding source commit before publishing a new release. Re-deploy that exact artifact (or rebuild the recorded commit with its lockfile and production origin), then repeat the production smoke checks. Do not reset or rewrite Git history to perform a deployment rollback.

## Maintenance

Edit content → validate → build → review preview → publish. Review dead links and outdated research periodically. Update dependencies in a separate change and run the same tests. The provided CI runs the preview dataset; adapt content-specific E2E expectations if replacing the sample records. No recurring automation was created.

## Local content recovery

Reset edits restores unsaved form changes to the last saved version. It does not undo a saved edit. Recover saved content from your source commit or backup. Removed research JSON is kept in `web/.admin-trash/`; restore it into `src/content/research/` only after checking that its ID and slug are unique. Preserve `src/content/workbooks/` alongside research JSON. Restore a renamed note by renaming its JSON file and updating its slug together, then validate and rebuild.

Current launch inventory: [remaining end-to-end work](LAUNCH_CHECKLIST.md).
