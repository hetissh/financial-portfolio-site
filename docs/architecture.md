# Architecture

This describes the implemented repository as of 9 October 2026. The decision
history is in [decisions.md](decisions.md); release and recovery procedures are in
[release.md](release.md).

## System and runtime boundaries

The public product is a finance/research portfolio rendered by Next.js App Router
as a static export. The export contains a home page, research index, article pages,
assets, metadata, discovery files, and a 404 page. It has no public application
server, account system, database, queue, or financial-data feed.

A separate **local development server** provides `/admin` and file-backed API
routes for editing profile, research, ordering, images, and workbooks. It runs only
with `PORTFOLIO_ADMIN=1` via `npm run admin`, binds to `127.0.0.1`, and uses
`.admin.ts`/`.admin.tsx` route extensions. `web/next.config.ts` excludes those
routes from the static export and uses a separate `.next-admin` build directory
and TypeScript configuration. This local editor is the only writable application
boundary; the exported site cannot save content.

| Area | Main paths | Responsibility |
| --- | --- | --- |
| Public pages | `web/src/app/`, `web/src/components/` | Render profile, research, navigation, attachments, and covers |
| Admin UI and API | `web/src/app/admin/`, `web/src/components/admin/` | Local forms, previews, ordering, uploads, and route handlers |
| Content contract | `web/src/lib/content-schema.ts`, `content.ts`, `research-order.ts`, `workbook-preview.ts` | Validate, load, filter, and order content and saved workbook previews |
| Admin persistence | `web/src/lib/admin/` | Guard requests; validate and write JSON; process images and workbooks |
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
The three reserved QA notes have IDs `qa-formatting`, `qa-images`, and
`qa-workflow`; the root `AGENTS.md` governs their maintenance. Preserve all
other notes and uploaded assets when updating them.

Images under `src/content/images/` and workbooks under
`src/content/workbooks/` are private source files. UUIDs link attachments or
rich content to these files. The asset generators own only
`public/images/covers/`, `public/images/articles/`, and
`public/downloads/workbooks/`; they rebuild those directories from assets used
by notes visible in the current mode. Unattached and draft sources remain local.
`public/` also holds directly served site assets and manually supplied
downloads. Do not use generated output as the source of truth.

## Main flows

1. **Public build:** `npm run build` validates all JSON with Zod and checks
   referenced assets, selects notes for `SITE_MODE`, prepares visible downloads
   and images, writes preview/production discovery files, generates the social
   image, then runs `next build` into `web/out/`. Production validation also
   requires an approved profile, a published note, and a valid HTTPS `SITE_URL`.
   `generateStaticParams` creates article routes from visible slugs.
2. **Admin save:** The editor calls a local `/admin/api/...` handler. Write
   requests must target a local Host, present the same Origin, and use the
   expected body type; JSON writes are size bounded. Routes validate with the
   same schemas as builds. The store checks a SHA-256 record or collection
   version (`If-Match`) to reject stale saves, then writes JSON through a
   temporary file and rename. A slug change changes the filename. Deletes move
   note JSON into ignored `.admin-trash/`. Saving content does not rebuild the
   static export.
3. **Uploads and embeds:** Sharp normalizes/crops accepted local images. Excel
   uploads are bounded and parsed in a worker; a shared schema validates the
   worker result, saved metadata, and browser preview before use. The local
   preview uses cached workbook values, not formula recalculation. Google Sheets and Microsoft
   embed input is reduced to a validated HTTPS provider URL; the public page
   displays provider iframes and original links. Provider access remains under
   Google/Microsoft sharing settings.
4. **Recovery:** `content:backup` snapshots private content, public assets,
   and trash with checksums. `content:restore` verifies that snapshot and writes
   a new destination rather than merging into live content.

## Security and failure boundaries

The local admin has no login because it is designed for the owner's loopback
machine, not a hosted service. Host and Origin checks protect write routes;
there is no public admin API. The static export has no runtime credentials.
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

The architecture deliberately keeps authoring local and publication separate.
Do not add public server behavior or expose private source files as a side
effect of ordinary content work. Update this document when verified changes
alter these boundaries, data flows, ownership, integrations, or failure behavior.
