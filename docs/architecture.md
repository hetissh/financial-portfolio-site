# Architecture

This describes the implemented repository as of 19 October 2026. The decision
history is in [decisions.md](decisions.md); release and recovery procedures are in
[release.md](release.md).

## System and runtime boundaries

The public product is a finance/research portfolio rendered by Next.js App Router
as a static export. The export contains a home page, research index, article pages,
assets, metadata, discovery files, and a 404 page. It has no public application
server, account system, database, queue, or financial-data feed.

A separate admin mode provides `/admin`, `/admin/home/`, sign-in, recovery, and file-backed API
routes for editing homepage copy, profile, research, ordering, images, and workbooks. Local
development uses `PORTFOLIO_ADMIN=1` via `npm run admin` on `127.0.0.1`;
`build:admin` and `start:admin` produce a server build that can serve visitors
and authenticated admins on one origin. `.admin.ts`/`.admin.tsx` route extensions
keep these routes out of the public static export. Admin mode uses a separate
`.next-admin` build directory and TypeScript configuration. The static export
cannot save content or use admin credentials.

The combined cloud mode uses one Next server for visitors and admins
(`build:cloud` / `start:cloud`). Supabase Postgres owns profile, research,
notebook order, fixed admin slots, sessions, and recovery links. Supabase Auth
owns passwords; private Storage owns uploaded images, workbooks, résumés, and
certification PDFs. Visitor pages read approved profile and published research
at request time. Managed public media is served through routes that verify a
current visible reference; manual public downloads use the public Storage
bucket. The admin uses the same validated editors with cloud persistence and
version checks. `supabase:import` copies local content and source uploads into
an empty project without overwriting different remote data; `supabase:bind-admins`
connects the two fixed slots to existing Supabase Auth users. The remote
migrations, import, account binding, and deployed runtime have not yet been
applied or verified, so cloud mode is not yet the public release.

| Area | Main paths | Responsibility |
| --- | --- | --- |
| Public pages | `web/src/app/`, `web/src/components/` | Render profile, research, navigation, attachments, and covers |
| Admin UI and API | `web/src/app/admin/`, `web/src/components/admin/` | Local forms, previews, ordering, uploads, and route handlers |
| Content contract | `web/src/lib/content-schema.ts`, `content.ts`, `research-order.ts`, `workbook-preview.ts` | Validate, load, filter, and order content and saved workbook previews |
| Admin persistence | `web/src/lib/admin/` | Guard sessions and requests; validate and write JSON; process images and workbooks |
| Admin identity | `web/src/lib/admin/auth-store.ts`, `web/.admin-data/auth.json` or `PORTFOLIO_AUTH_FILE` | Two fixed account IDs, password hashes, sessions, reset and email-change tokens, attempts and audit events |
| Source content | `web/src/content/` | Profile, notes, saved order, private image originals/crops, and workbook sources |
| Export preparation | `web/scripts/` | Validate content and generate public assets, discovery files, and static build |
| Tests | `web/tests/unit/`, `web/tests/e2e/`, `web/tests/admin/` | Unit, public export, and isolated admin browser checks |
| Operations | `docs/release.md`, `.github/workflows/ci.yml`, `web/vercel.json` | Release requirements, verification, and proposed static hosting |

## Content ownership and identifiers

`web/src/content/profile.json` is the profile source of truth. Each note is a
JSON file under `web/src/content/research/`; its `id` and `slug` must be unique.
The slug names its file and public `/research/<slug>/` route. `id` identifies it
inside the admin, saved notebook order, and related workflows. The optional
`research-order.json` stores note IDs; missing/new entries fall back to
`featuredOrder`, date, then ID. Drafts never render publicly. Preview renders
`sample` and `published` notes; production renders only `published` notes.
The browser icon is generated from the saved profile monogram in root metadata:
it updates on the combined server after a profile save and on static export
when the site is rebuilt. No separately edited favicon source is required.
The optional `portfolioTitle`, `researchLead`, and `researchAccent` profile
fields control the public card journey. Existing profiles fall back to
`displayName` and the default research lines. The existing `intro` is the
hero description and search description. Homepage and Profile admin routes show
focused sections of the same editor draft and save through the same validated,
versioned profile API; the legacy
`headline` fields remain in JSON for compatibility but are no longer shown
in the home hero.
Profile contact links and the optional contact email render in a compact
contact section after page content. The home page renders a separate
credentials section after selected research, containing only the visible
résumé and certifications.
Legacy profiles parse with an empty certification list and a hidden résumé.
Admin Profile saves these fields through the existing validated, versioned
profile API. The authenticated résumé upload route accepts bounded PDFs into
private `src/content/resumes/` and serves their preview only to an admin.
Saving a visible résumé copies its source to the generated
`public/downloads/resumes/` directory; hiding or removing it removes the public
copy. Certification PDFs use the same private-source and visible-copy rule under
`src/content/certifications/` and `public/downloads/certifications/`. The static build runs these selection steps before export. Existing
manual public résumé paths remain valid. Content backups include the private
sources; deployment must retain them with the profile content.
The three reserved QA notes have IDs `qa-formatting`, `qa-images`, and
`qa-workflow`; the root `AGENTS.md` governs their maintenance. Preserve all
other notes and uploaded assets when updating them.

Images under `src/content/images/`, workbooks under
`src/content/workbooks/`, uploaded résumés under `src/content/resumes/`, and
certification PDFs under `src/content/certifications/`
are private source files. UUIDs link attachments or
rich content to these files. The asset generators own only
`public/images/covers/`, `public/images/articles/`,
`public/downloads/workbooks/`, `public/downloads/resumes/`, and
`public/downloads/certifications/`; they rebuild those directories from assets used
by notes visible in the current mode. Unattached and draft sources remain local.
`public/` also holds directly served site assets and manually supplied
downloads. Do not use generated output as the source of truth.

## Main flows

The home page renders its title and description in static HTML. A client
`CardJourney` enhances the decorative card with Three.js and drives the
dashboard and research handoff with GSAP ScrollTrigger as the visitor scrolls.
The grid formulas and chart figures are illustrative presentation data, not
saved research or a financial feed. A flat card remains visible when WebGL is
unavailable, and reduced-motion visitors see the card, dashboard, and research
copy in document order. A shared navy grid on the document background runs
from the header through the home, research index, articles and footer; the
admin keeps the grid around solid editing panels. The home ends after selected
research and the credentials section. The former About and Contact sections and their navigation links
are hidden, while their saved profile fields remain editable for future use.
Research cards and article text use light reading surfaces over the grid.

1. **Public build:** `npm run build` validates all JSON with Zod and checks
   referenced assets, selects notes for `SITE_MODE`, prepares visible downloads
   and images, writes preview/production discovery files, generates the social
   image, then runs `next build` into `web/out/`. Production validation also
   requires an approved profile, a published note, and a valid HTTPS `SITE_URL`.
   `generateStaticParams` creates article routes from visible slugs.
2. **Admin access and save:** The two accounts are bootstrapped once from private
   configuration. Each admin route checks an active server-side session. Write
   requests must target the configured admin origin (or a local development
   origin), present the same Origin, and use the expected body type; JSON writes
   are size bounded. Routes validate with the
   same schemas as builds. The store checks a SHA-256 record or collection
   version (`If-Match`) to reject stale saves, then writes JSON through a
   temporary file and rename. A slug change changes the filename. Deletes move
   note JSON into ignored `.admin-trash/`. A successful server-mode edit
   revalidates visitor pages; saving content does not rebuild the static export.
3. **Uploads and embeds:** Sharp normalizes/crops accepted local images. Excel
   uploads are bounded and parsed in a worker; a shared schema validates the
   worker result, saved metadata, and browser preview before use. The local
   preview uses cached workbook values, not formula recalculation. Google Sheets and Microsoft
   embed input is reduced to a validated HTTPS provider URL; the public page
   displays provider iframes and original links. Provider access remains under
   Google/Microsoft sharing settings.
   The authenticated Unsplash route searches photos with the server-only
   `UNSPLASH_ACCESS_KEY`. The admin saves Unsplash image CDN and attribution URLs
   directly in the cover record, and the public pages hotlink that CDN image and
   show photographer/Unsplash links. Selecting a result triggers its API
   `download_location`; no Unsplash image bytes are copied into local storage.
4. **Recovery:** `content:backup` snapshots private content, public assets,
   and trash with checksums. `content:restore` verifies that snapshot and writes
   a new destination rather than merging into live content.
5. **Account recovery:** Resend sends a 15-minute link to an active admin email.
   Only its token hash is saved. Reset or password change updates the scrypt hash
   and revokes all sessions. Email changes require the current password and
   confirmation at the new address. Disabled accounts cannot sign in or reset.
   Either admin may request a confirmed email change for either account using
   their own password. Account IDs cannot be added or deleted; removing access
   disables the other account and revokes its sessions. The current admin
   cannot disable themself.
6. **Cloud mode:** The same guarded admin routes select Postgres records and
   Supabase Auth sessions when `PORTFOLIO_DATA_SOURCE=supabase`. Content writes
   compare validated record hashes and database row versions before updating.
   Image and workbook processors use temporary local space, then upload their
   source and metadata to private Storage; a partial upload removes only that
   attempt's completed objects. PDFs are validated and uploaded directly to
   private Storage. Public media routes check the current approved profile or
   published note before streaming a managed object. Uploaded objects that are
   not yet referenced can remain private; the importer refuses to replace an
   object with different bytes. A failed cloud request returns an error and
   leaves the editor draft available for retry.

## Security and failure boundaries

Admin mode uses an HttpOnly, SameSite session cookie backed by hashed random
tokens in private JSON or cloud Postgres. All pages and API handlers check the session, and
write handlers check Origin. Local login and recovery limits use the JSON store;
cloud sign-in uses Supabase Auth and cloud recovery counts requests in Postgres.
Fixed account IDs are in code, but emails,
password hashes, sessions, and audit entries are private runtime data. The
Git-ignored `web/.env.local` supplies local server settings and Resend credentials;
initial admin passwords are read from it only during bootstrap and then removed.
A deployed host supplies the same settings through its environment or secret
manager. Admin secrets are never prefixed with `NEXT_PUBLIC_`. The
combined site's header and footer link to `/admin`; signed-out visitors are
redirected to login by the protected route. The static export omits these links.
Signing out revokes the session and redirects the browser to the public main page.
The JSON file must live outside `public/`, `src/content/`, and `out/`; it is ignored
by Git and excluded from content backups. Admin-only media endpoints require a
session. Separate `/media` routes serve only assets referenced by visitor-visible
notes, with draft assets available to an authenticated preview. The static
export has no runtime credentials or admin routes.
Input schemas reject invalid dates, duplicate IDs/slugs, unsafe asset paths,
unapproved embed hosts, HTTPS URLs containing credentials, and missing
referenced files. Uploads enforce type, size, and image pixel or workbook
processing limits. Known upload input failures return an editable 400 response;
unexpected filesystem or processing failures are logged locally and return a
generic 500 response. An upload that cannot finish writing its metadata removes
only the files created by that attempt. Admin validation errors remain editable;
stale versions return conflicts rather than overwriting newer content. The
admin validates response payloads before marking a draft saved; malformed
responses leave the draft available for retry. Corrupt workbook metadata is
treated as an unavailable attachment rather than rendered as rows. Recovery is through trash or
verified content backups.

There are no application webhooks, background jobs, scheduled jobs, or queue
retries in this repository. Build generators run as explicit commands and
regenerate their owned outputs. Hosted embed failures are handled in the reader
with Reload and Open original; the site does not proxy provider content.

## Deployment and constraints

`web/vercel.json` configures a production static export to `out/`; any host
serving that directory with directory indexes and real 404 responses can serve
the public site. `docs/release.md` describes release prerequisites and rollback.
The repository has an `origin` remote and CI on pushes and pull requests, but
repository evidence does not establish an active hosting project, domain, or
deployed URL. Deployment remains an owner decision. `SITE_MODE=preview` builds
are non-indexable and include samples; they are not an access-control mechanism.

The local file-backed combined server needs a single writable instance and
persistent volume for credentials and content. Multiple writers to one JSON
file and ephemeral filesystems are unsupported in that mode. The cloud server
uses Postgres, Auth, and Storage and can run without persistent application
files; its migrations and hosted behavior have not been verified remotely.
`ADMIN_ORIGIN` must match the external HTTPS origin;
`RESEND_API_KEY` and `RESEND_FROM_EMAIL` are needed for email flows. The current
static release path stays separate. Update this document when verified changes
alter these boundaries, data flows, ownership, integrations, or failure behavior.
