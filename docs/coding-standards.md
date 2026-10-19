# Coding standards

These are the conventions implemented in this repository as of 18 October 2026.
`AGENTS.md` is the canonical agent entry point. The relevant defaults copied
from the attached rules kit live in `docs/ai-rules/`; the architecture and
decisions documents explain project-specific choices.

## Stack and dependency management

| Concern | Repository convention |
| --- | --- |
| Languages | TypeScript/TSX, JavaScript/MJS, CSS, JSON; no Python application code |
| Runtime | Node `24.19.0` in `web/.nvmrc`; `web/package.json` declares Node `>=22.0.0` |
| Package manager | npm with committed `web/package-lock.json`; use `npm ci` for reproducible installation |
| Framework | Next.js `16.3.8` App Router, React/React DOM `19.3.0`; static export or combined cloud server |
| Key libraries | Zod `4.6.5` for content contracts, Tiptap for rich editing, Sharp `0.35.5` for image processing, SheetJS for workbook previews, Supabase JS `2.117.3` for the cloud migration path, Three.js `0.186.1` and GSAP `3.15.0` for the home card journey |
| Styling | CSS modules, global CSS, and `web/src/styles/tokens.css`; self-hosted fonts |
| Quality tools | Prettier `3.9.9`, ESLint `9.39.5`, TypeScript `6.0.3`, Vitest `5.0.2`, Playwright `1.63.0` |

Dependencies are pinned in `web/package.json` and the lockfile. Prefer the
existing stack and add a dependency only for a concrete need. The SheetJS
tarball comes from its official CDN as recorded in the lockfile. Do not run
unrelated upgrades while changing features.
The home page loads Three.js and GSAP in a client component after hydration.
Keep essential copy and navigation in server-rendered HTML. Animation should
decorate the content, retain a readable WebGL fallback, respect reduced motion,
and release render loops, observers, GPU resources, and scroll triggers on
unmount.

## Commands (run from `web/`)

| Purpose | Command |
| --- | --- |
| Public development | `npm run dev` |
| Local admin | `npm run admin` |
| Bootstrap fixed admin accounts | `npm run admin:bootstrap` (reads private `.env.local`) |
| Inspect/import local content into a fresh Supabase project | `npm run supabase:import` (dry run), then `npm run supabase:import -- --apply` after setup |
| Match the two fixed slots to Supabase Auth users | `npm run supabase:bind-admins` (dry run), then `npm run supabase:bind-admins -- --apply` after both users exist |
| Build combined admin server | `npm run build:admin` |
| Start combined admin server | `npm run start:admin` |
| Develop combined cloud server | `npm run admin:cloud` |
| Build and start combined cloud server | `npm run build:cloud`, then `npm run start:cloud` |
| Content validation | `npm run validate:content` |
| Lint | `npm run lint` |
| Format maintained code | `npm run format` |
| Check code formatting | `npm run format:check` |
| Check purpose comments | `npm run comments:check` |
| Public type check | `npm run typecheck` |
| Admin source type check | `npm run typecheck:admin` |
| Unit tests | `npm run test:unit` |
| Preview export | `npm run build` |
| Static preview | `npm run preview` |
| Public browser tests | `npm run test:e2e` |
| Admin browser tests | `npm run test:e2e:admin` |
| Release readiness | `npm run release:check` |
| Production export | `SITE_URL=https://your-real-domain npm run build:release` |

`npm run build` invokes content validation and the asset generators, including
visible résumé and certification PDF copy steps. `npm run build:admin` prepares
those local copies before compiling the combined server. Cloud builds read and
write managed uploads in Storage and do not generate public file copies.
Preview and admin browser tests use local servers and isolated ports. Admin
browser tests copy `src/content` to a temporary directory; they must never
write to the owner's real content. CI in `.github/workflows/ci.yml` installs
from the lockfile, then runs formatting and purpose-comment checks, lint, both type checks, unit tests, build, and
public/admin browser tests on pushes and pull requests.

Prettier is pinned and configured by `web/.prettierrc.json` (100-column print
width, two-space indentation, single quotes in JavaScript/TypeScript, and
trailing commas). `npm run format` and `npm run format:check` cover maintained
source, scripts, tests, and web configuration. `web/.prettierignore` excludes
private content, generated assets, build output, and lockfiles. ESLint
(`web/eslint.config.mjs`, Next core web vitals and TypeScript rules) remains the
lint check. Formatting is a readability baseline, not a substitute for clear
names, focused functions, and useful comments.
TypeScript is strict in `web/tsconfig.json`. The public check runs Next type
generation then `tsc --noEmit`; the separate admin source check avoids mixing
public and admin generated route types.

The Supabase migration files live under `web/supabase/migrations/`. The
one-time import command reads `.env.local`; its default dry run makes no remote
changes. `PORTFOLIO_DATA_SOURCE=supabase` selects the combined server and
cloud data paths. Keep production on the existing static deployment until the
remote migrations, import, both admin accounts, recovery email, and server
deployment have been verified.

The standards apply to maintained source, scripts, tests, configuration, and
content. Next.js writes temporary compiler output under `web/.next/` and
`web/.next-admin/`, including client-reference manifests such as
`page_client-reference-manifest.js`. Those files are generated from the source
and Next.js itself, may be dense or machine formatted, and must not be edited
to meet source style rules. Both build directories are ignored by Git and
ESLint; the admin type check also excludes them. Investigate a problem in a
generated file by tracing it to maintained source, `web/next.config.ts`, or the
framework version.

## Comments and maintainability

Always leave useful comments in maintained code. Each source, script, test, and
stylesheet file should begin with a short comment explaining its purpose or
boundary. Document exported behavior and non-obvious contracts, especially
validation rules, security checks, persistence, generated-output ownership,
browser workarounds, and failure or retry behavior. Use inline comments to
explain *why* a surprising step is necessary. Keep comments next to the code
they describe and update them whenever behavior changes. Do not narrate
obvious syntax or copy a function name into a comment; those comments obscure
the useful ones. Generated files and private content records are excluded.
`npm run comments:check` enforces the opening comment on maintained code; review
still determines whether each explanation is useful and accurate.

## Source organization and naming

- Public routes live in `web/src/app/`, UI in `web/src/components/`, tokens in
  `web/src/styles/`, and domain/content operations in `web/src/lib/`.
- Admin pages and handlers use `.admin.tsx` and `.admin.ts` extensions under
  `web/src/app/`. Keep public and admin build boundaries intact.
- Admin persistence, request guards, uploads, and form helpers live in
  `web/src/lib/admin/`. Build and maintenance commands live in `web/scripts/`.
- Content is one JSON note per slug under `web/src/content/research/`, with
  profile and optional order files alongside it. Use unique stable `id` and
  slug values. Keep the three QA IDs/slugs reserved for showcase notes.
- React components and exported types use PascalCase; existing utilities
  and file names mostly use descriptive camelCase or kebab-case. Follow the
  convention of the area being changed instead of renaming unrelated files.
- Unit tests are `*.test.ts`/`*.test.tsx` in `tests/unit/`; browser tests are
  `*.spec.ts` in `tests/e2e/` or `tests/admin/`.

## Data, APIs, and errors

`web/src/lib/content-schema.ts` defines Zod contracts for profile, notes,
attachments, covers, statuses, URLs, and release eligibility. Use those
contracts for new content fields and validate external values at runtime;
TypeScript types alone do not validate JSON, uploads, or provider URLs. Keep
build validation and admin save validation aligned. The rich-content schema
and provider URL rules are in `rich-content.ts` and `sheet-embed.ts`. The
shared workbook preview contract in `workbook-preview.ts` validates worker
results, persisted metadata, and browser responses. Admin editors validate
successful save and upload payloads before marking drafts saved or using
returned files; malformed responses keep edits available for retry.

The admin API requires an active session. Its write routes enforce the configured
Host and same Origin (or a local development origin), content type/body limits,
and `If-Match` versions as applicable. Preserve
specific 400/403/404/409/413/415/422 responses for user-correctable errors;
unexpected failures may be logged server-side but should not expose internal
details to the browser. The Unsplash access key is server-only and belongs in
Git-ignored `web/.env.local` or the host environment as `UNSPLASH_ACCESS_KEY`;
public cover records hotlink Unsplash image URLs and retain attribution. For
image and workbook uploads, use `UploadInputError`
for known bad input; `uploadErrorResponse` logs unexpected failures and returns
a generic 500. If an upload cannot finish writing its metadata, remove only
files created by that attempt. File-backed JSON writes use temporary files and
rename; removals go to trash. Do not bypass version checks or write directly
to generated public asset directories. There is no database or migration
framework. Local secret configuration lives in Git-ignored `web/.env.local`
(mode 0600) or the host environment; never put real credentials in
`.env.example`, test fixtures, tracked source, or `NEXT_PUBLIC_` variables.
Initial admin passwords are supplied only to `admin:bootstrap` and removed
from the env file afterward. Admin credential hashes live in the private
`PORTFOLIO_AUTH_FILE` JSON file
(default `.admin-data/auth.json`), never in `src/content`, `public`, or tracked
source. Only `admin:bootstrap` creates the two accounts. Passwords are scrypt
hashes; sessions and one-time tokens are stored by hash and checked at each
protected request. Resend credentials are server-only environment settings. A
server build requires one writer and persistent storage; the static export
still excludes admin and authentication routes.

Upload sources and JSON content stay under `src/content/`; generated assets
in `public/` are derived for visible notes. Avoid adding private sources to
the static export. External Google/Microsoft sheets render only validated
provider URLs. Never insert pasted iframe HTML or other untrusted HTML.
Public HTTPS links must not contain URL username or password fields. Do not
commit secrets. `.env.example` documents preview mode and production `SITE_URL`;
`.env*` files other than the example are ignored by Git.

Dependency review uses `npm audit` on the committed lockfile. On 8 October
2026, a new Next.js advisory affected the previously pinned `16.3.6`; the
compatible `16.3.8` patch was applied. The 9 October audit still has zero
production advisories; the remaining five high full-tree entries
belong to the development-only Next ESLint dependency chain through `braces`
`3.0.3`, for which no patched release was available at this review. Track this
upstream; do not force a breaking Next ESLint downgrade merely to silence the
audit.

## Frontend and accessibility

Reuse CSS tokens and existing components. Preserve semantic controls, labels,
keyboard behavior, focus restoration, reduced-motion support, alt text, and
mobile layouts. Public content is readable without JavaScript where the
existing pages support it. Browser coverage spans desktop and mobile
Chromium/Firefox/WebKit configurations; test the viewports and interaction
states relevant to the change. The public export must continue to exclude
admin routes, draft notes, and private originals.

## Git, release, and definition of done

The current checkout is `develop`, and an `origin` remote is configured.
The repository does not declare a commit-message format, a protected branch,
or an automatic deployment trigger. Do not infer one. Follow
`docs/release.md` for content approval, production validation, hosting, and
rollback. The preview dataset is deliberately non-indexable; production
requires owner-approved profile data, a published note, and `SITE_URL`.

For a site/admin change, follow the root `AGENTS.md` showcase routine:
update the same three sample notes, run `npm run showcase:update -- "description"`,
validate and test appropriately, rebuild and inspect the preview, record actual
results in `docs/qa-evidence/SHOWCASE_NOTES.md`, and review content diffs for
unintended edits. For documentation-only changes, check the documentation and
run the applicable repository gates without rewriting sample content.
Update this file only when a verified change alters these conventions, tooling,
commands, versions, or an intentional deviation.

## Intentional choices relative to the shared defaults

| General expectation | This repository's choice and reason |
| --- | --- |
| Server authentication for a hosted editor | The admin mode now checks two fixed accounts and revocable sessions. It is excluded from the public export; a hosted server needs persistent private JSON and a configured HTTPS origin. |
| Persistent application database | Private JSON is the source of truth for the two admin accounts. A single-writer persistent volume is required for a hosted combined server. |
| Hosted retries and background jobs | There are no server jobs or webhooks. Explicit build commands regenerate derived assets. |
| Automated formatter | Prettier was added for the explicitly requested codebase-wide standardization; generated output and private content remain excluded. |
