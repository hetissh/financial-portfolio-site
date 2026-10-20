# Showcase note evidence — site content cleared 20 October 2026

## CR: restore deployment gate with isolated admin browser data — 20 October 2026

The site retains the three reserved `sample` showcase notes; the removed
personal/demo notes and unrelated test uploads remain cleared. The admin
browser setup now creates its legacy editing records and a small workbook only
inside its temporary content copy, so the tests work without restoring those
records to the real site. The checklist generator also records the expected
authenticated cover preview and hydration behavior. Rebuilt static HTML
contains the updated checklist in all three showcase routes.

The admin editor now routes cover images in private previews through its
authenticated image endpoint. The Overview uses the same endpoint for saved
cover images, so server and client render the same URL and avoid a hydration
mismatch. The release-readiness browser check selects the first of the two
intentional “Create a note” actions.

Passed locally: content validation (3 visible preview notes), formatting,
purpose-comment check, lint, public/admin TypeScript checks, all 114 unit tests,
Cloudflare Worker build, static Next build, all 35 admin Chromium browser checks,
and `git diff --check`. A focused admin run also passed the previously failing
cover import/crop and release-readiness checks. Full Firefox/WebKit admin and
public cross-browser checks are delegated to the required GitHub Actions run;
Cloudflare deployment is pending that gate.

## Local demo content cleanup — 20 October 2026

At the user's request, removed all seven demo/test research records, their managed showcase illustrations, the demo workbook and its generated download, the test certification PDF and generated copy, and fake profile links/certification entries. Preserved the saved profile and email, both résumé sources and the visible résumé download, and the unrelated uploaded wallpaper. Automated unit tests now read a neutral fixture under `web/tests/fixtures/`, outside the content importer; the tests still exercise showcase generation in temporary folders without restoring showcase records to site content.

Content validation passed with zero visible research notes. The Supabase importer dry run reports one profile, zero notes (zero published), and five media objects; no remote import was applied. Formatting, lint, public and admin TypeScript checks, purpose-comment checks, all 111 unit tests, `git diff --check`, and the static export build passed. The static export includes the normal `/research/` index with no demo notes and a generated not-found sentinel route required by Next.js when exporting an empty dynamic route. The regular `npm run build` wrapper could not start because the sandbox denies the temporary IPC socket used by its `tsx` runner; invoking its build generators directly with Node 24.19.0 and then Next's build completed successfully. The standard content-validation wrapper has the same sandbox limitation; its underlying script passed directly with Node 24.19.0. The three reserved showcase notes were intentionally deleted and not regenerated, as requested.

For the profile-matched tab icon follow-up, the favicon SVG now uses the public monogram badge palette (brass `#ddc986` background and navy `#00007f` initials) while retaining the saved profile initials. Formatting, lint, public/admin TypeScript checks, purpose-comment checks, content validation, all 111 unit tests, `git diff --check`, and the static export build passed. Inspection of exported home metadata confirmed the icon carries both colors and the current `FP` monogram. Showcase notes remain cleared per the cleanup request.

Latest update: 20 October 2026 — profile-matched favicon palette; local demo/test notes and assets remain cleared; remote Supabase remains unchanged.

## CR: Cloudflare Workers compatibility checks — 20 October 2026

The combined public/admin Worker build now has a Cloudflare runtime settings
adapter and Worker-safe upload paths. Browser image normalization and workbook
preview generation keep local Sharp and Node worker-thread dependencies out of
Worker upload routes; images, workbooks and PDFs are validated and sent directly
to private Supabase Storage. The three reserved showcase records were refreshed
by the required showcase updater and remain `sample`; content validation reports
three visible preview notes. No other content files were changed by that updater.

Checks passed: Cloudflare Worker production build, `format:check`, `comments:check`,
lint, public and admin TypeScript checks, all 114 unit tests, content validation,
and `git diff --check`. A local Worker smoke check returned 200 for `/`,
`/research/`, `/login/`, and `/forgot-password/`; protected `/admin/`,
`/admin/profile/`, and `/admin/research/new/` redirected to login, and an
unauthenticated image upload returned 401. The isolated admin Playwright suite
could not start because the user's existing Next.js development server owns the
shared `.next-admin` build directory. Authenticated upload flows and a deployed
Cloudflare preview were not tested; no deploy was performed. The generated local
Worker secrets file is private and ignored by Git.


## CR: Publish the selected résumé on home — 19 October 2026

The existing uploaded four-page PDF was selected in Profile, but its public
visibility flag was off. Only that flag was enabled through the validated profile
save path, which prepared the public PDF download. The résumé now appears above
Certifications in the home credentials section. No certification, contact,
research, or other profile value was changed. The three reserved sample notes
were refreshed with the résumé visibility check and remain `sample`.

Content validation (7 preview notes), `format:check`, lint, public/admin
TypeScript checks, all 111 unit tests, and the static preview build passed.
The rebuilt preview contains all three refreshed sample pages and the résumé
link. Desktop and mobile Chromium showcase checks passed (2 tests). A live
browser check at 390 and 1440 pixels confirmed that the résumé link is visible
and its PDF returns 200 with `application/pdf`. The isolated admin résumé test
could not start because the user's running admin server owns the shared Next.js
development build folder. The standard `showcase:update` command hit the
sandbox's `tsx` IPC restriction; its underlying script succeeded with
`node --import tsx`.

## Final local verification — 19 October 2026

The three reserved sample notes were refreshed again for the certification PDF,
combined Supabase server, and readable admin controls change. The update kept
their reserved IDs and `sample` status; all three current CR descriptions were
present in the rebuilt static preview. The existing profile, personal notes and
uploaded files were not edited by this update. The admin checkboxes were enlarged
to 24 pixels after an accessibility run found their targets too small.

Final checks passed: content validation (7 preview notes), `format:check`,
`comments:check`, lint, public/admin TypeScript, all 111 unit tests, the static
preview build, the combined cloud build, `git diff --check`, all 35 isolated
admin Chromium browser checks, and both desktop and mobile Chromium showcase
checks. The standard `showcase:update` wrapper still encountered the sandbox's
`tsx` IPC restriction; the same updater completed with `node --import tsx`.
Admin browser checks used installed Google Chrome because bundled Chromium was
absent. Cloud operations remain local verification only: the remote Supabase
project still lacks the portfolio tables and no remote import, Auth binding or
deployment was performed. The local combined file-backed server was restarted
on port 3000; home returned 200 and the protected admin returned a 307 sign-in
redirect.

For the certification PDF and combined cloud server change, the three reserved
notes were refreshed with the new upload, visibility, and cloud checklist.
Their IDs remain `qa-formatting`, `qa-images`, and `qa-workflow`, and each status
remains `sample`. The updater reported that it kept the other notes and profile
settings; a content diff confirmed only these three notes changed during this
update. The user's existing résumé source and profile were preserved. The
rebuilt preview contains all three sample article routes. Desktop and mobile
Chromium showcase browser checks passed (2 tests), as did four isolated admin
browser checks covering contact details, résumé publication, certification PDF
upload and preview, its saved home link, the Credentials anchor, and hiding it.

Content validation passed (7 preview notes). Formatting, purpose comments,
lint, both TypeScript checks, and all 111 unit tests passed. Static preview
and combined cloud server builds passed. The import dry run found one profile,
seven notes (one published), and twelve media objects. All four migrations
applied to temporary local PostgreSQL. A read-only remote check returned
`PGRST205` for `portfolio_profile`: the configured project has no portfolio
tables yet. No remote migration, import, Auth binding, server deployment, or
cloud browser journey was performed. The exact `npm run showcase:update`
wrapper failed because this sandbox blocks the `tsx` IPC socket; running its
underlying script with `node --import tsx` succeeded and updated the same three
notes. The first browser attempt lacked Playwright's bundled Chromium; rerunning
against installed Chrome passed.

Latest update: 19 October 2026 — certification PDFs and a combined cloud server
implementation; remote cutover awaits project database access and deployment.

For the 19 October home-page credentials change, the selected-research count
label was removed and the résumé/certification display was moved into its own
home-page section. `node --import tsx scripts/update-showcase-notes.ts` updated
the same three reserved sample notes; their IDs, slugs, and `sample` statuses
remain unchanged. Formatting, purpose-comment checks, lint, TypeScript, and
content validation passed. The standard build wrapper could not start its
`tsx` subprocess because the sandbox denied its temporary IPC socket; running
the build generators and Next build directly under Node 24.19.0 succeeded.
The rebuilt home HTML has no “notes to explore” label and includes the
dedicated credentials section. All three showcase routes are present in the
rebuilt preview. Automated test suites and interactive browser checks were not
run for this change. The showcase updater left the profile and uploaded résumé
sources untouched; only the reserved sample notes and their managed assets
were refreshed.

Latest update: 19 October 2026 — added a dedicated home credentials section and removed the research count label. Earlier change evidence is retained below.

| Sample note | Public preview route | Admin record | Examples and checks |
| --- | --- | --- | --- |
| Writing with clarity | `/research/showcase-formatting/` | `qa-formatting` | Bold, italic, combined emphasis, worded points, links, h3/h4 headings, soft breaks, visible disc/circle/square bullets, nested numbers, lowercase/uppercase letters; keyboard nesting, undo/redo, save/reload/reset. |
| Evidence in pictures | `/research/showcase-images/` | `qa-images` | Landscape/portrait illustrations, 25/50/75/100% centered images, captions, text before/after an image, images in headings and lists; paste/import/crop/replace/remove, validation, cancel and retry; theme artwork, Hero Patterns and imported covers. |
| From draft to conversation | `/research/showcase-workflow/` | `qa-workflow` | Profile/About/Contact/monogram checks, email drafts, first-edit readiness, draft/publish/rename/reset/stale-tab/trash workflow, workbook/formula/download/Google Sheets checks, legacy paragraphs and reflection points, responsive navigation and production visibility. |

These are sample records, available in preview and local admin, excluded from production. They contain illustrative content and expected-behavior checklists. Passing tests are reported below separately; a saved note cannot demonstrate a network error or stale-tab conflict by itself.

## Routine after every CR

Follow the root `AGENTS.md`. Update the examples and checklists in `web/src/lib/showcase-notes.ts`, then run this command from `web/`:

```sh
npm run showcase:update -- "Short description of this change request"
```

The command updates the same three reserved records and two managed private illustration assets. It validates the records and refuses collisions with personal IDs, slugs or images. It does not change the profile, other notes or uploaded assets. The existing personal `test` note is preserved. Update this evidence document with actual check results, rebuild the preview, and inspect all three notes. This is a development routine, not a scheduled task.

## Current validation

For the Supabase admin setup continuation, the configured project URL,
publishable key, and secret key were present in the ignored, mode-0600
`web/.env.local`; no values were printed. Read-only project checks found no
portfolio tables, Storage buckets, or Auth users yet. The first migration still
needs to be applied remotely. The new second migration for private admin
sessions applied cleanly to temporary local PostgreSQL with the first migration
already present, and that test server was stopped. The admin binding command
is a dry run by default and has not been applied remotely. The cloud session
module is not connected to live routes; the current local admin remains on its
private JSON.

`npm run showcase:update -- "Prepare Supabase Auth binding for the two fixed
admin slots"` updated only the same three reserved sample notes. All retain
their reserved IDs, slugs and `sample` status. No personal note, profile or
uploaded source asset changed. The static preview build, content validation,
formatting, purpose comments, lint, both TypeScript checks, and all 101 unit
tests passed. The rebuilt desktop and mobile Chromium showcase checks both
passed, opening all three notes. Live Supabase login, Resend delivery, admin
writes, and Cloudflare deployment remain unverified and unavailable.

For the Supabase migration preparation, `npm run showcase:update -- "Prepare
Supabase-backed live portfolio content"` refreshed the same three reserved
sample notes and their hosted-editing/media checklists. All three retain their
reserved IDs, slugs, and `sample` status. Source content review found no edits to
the profile or personal notes; the generated social image is the only changed
public asset. The rebuilt static preview contains all three checklists. Focused
desktop and mobile Chromium showcase checks passed (2 tests total).

The SQL migration applied to a local PostgreSQL test database with stub Supabase
schemas. Anonymous reads excluded placeholder profiles and drafts; the public
order function returned published IDs only; fixed-slot triggers blocked deletion
and disabling the last active admin. The importer dry run found one profile,
seven notes (one published), and twelve media objects. No remote import or
Supabase project was used. The ordinary static preview build and a separate
cloud-mode Next server build with placeholder project values passed; the latter
shows request-time visitor routes. The placeholder secret key did not appear in
client build assets. Formatting, purpose comments, lint, both TypeScript checks,
and all 98 unit tests passed. Full cross-browser Playwright was initially
unable to start because browser binaries were missing; Chromium was installed
in temporary storage and the focused showcase checks then passed. Cloud admin
authentication, writes, uploads, workbook previews, and Workers deployment are
not implemented or verified, so cloud mode is not ready for release.

For the monogram icon change, the root metadata now produces an encoded SVG
favicon from the validated profile monogram. `npm run showcase:update -- "Match
the browser tab icon to the saved monogram"` refreshed the same three reserved
sample notes and their profile checklist. `npm run format:check`, purpose-comment
check, lint, both TypeScript checks, all 95 unit tests, content validation, and
the static preview build passed. Focused Chromium checks passed for the public
home page and all three showcase notes at desktop and mobile widths. The home
page browser test confirmed its icon data matches the visible header monogram;
the running combined site also served the icon in its HTML metadata. The unit
test verified a changed monogram changes the icon URL and unsafe SVG characters
are escaped. An actual profile save and non-Chromium browsers were not checked.
No profile, personal note, or uploaded asset was changed.

For the private account refresh, the operator updated the two fixed account
slots in the active auth JSON using scrypt hashes. Existing sessions, pending
reset and email-confirmation links, and rate-limit attempts were cleared. Both
updated accounts authenticated through the app's `logIn` function and were
immediately signed out; no plaintext password was saved in tracked files.
The auth file remains mode 0600. `npm run showcase:update -- "Refresh private
admin accounts and revoke earlier sessions"` refreshed the same three reserved
sample notes, whose checklist describes the flow without real credentials.
Formatting, purpose comments, lint, both TypeScript checks, all 94 unit tests,
content validation, and the static preview build passed. The rebuilt Chromium
showcase check passed on all three notes at desktop and mobile widths. The
isolated admin browser suite was not run while the local admin held Next's
`.next-admin` development directory; authentication was verified directly by
the app's store. Git content review found no personal note, profile, or uploaded
asset changes.

For the private environment configuration change, `web/.env.local` was created
with mode 0600 and confirmed ignored by Git. It points to the already active
private auth JSON, which also has mode 0600 and contains exactly two account
slots. The Resend settings remain unset until a verified sender and key are
provided. The static export was searched for the configured private auth path;
there were no matches. `npm run showcase:update -- "Configure admin credentials
through a private environment file"` refreshed only the three reserved sample
notes. All retain `sample` status, their IDs and slugs, and the same managed
illustrations. Git content review found no personal note, profile, or uploaded
asset edits.

`npm run format:check`, `npm run comments:check`, lint, both TypeScript checks,
all 94 unit tests, content validation, and the static preview build passed.
The rebuilt Chromium showcase browser check passed on all three notes at desktop
and mobile widths. A focused isolated admin browser run could not start because
the currently running local admin holds Next's `.next-admin` development build
directory; the live session was left running. Live Resend delivery was not
verified because no sending credentials are configured.

For the password visibility change, `npm run showcase:update -- "Add Show and
Hide controls to admin password fields and clarify credential storage"` updated
the same three sample notes. `npm run format:check`, lint, public and admin type
checks, the purpose-comment check, content validation, the static preview
build, and all 94 unit tests passed. The Chromium showcase browser check opened
all three notes at desktop and mobile widths. A separate live Chrome check at
390 pixels toggled the password type on login, reset, and Admin management
forms; the typed login value was preserved, and the login page had no
horizontal overflow. After the operator supplied passwords meeting the
12-character requirement, both updated accounts signed in to the local
preview; logout returned home and reopening Admin required a new sign-in.
The running preview's private JSON now stores the updated password hashes,
and all previous sessions were revoked. The repository test fixture was
returned to disposable credentials. No personal note, profile, or uploaded
asset changed in source content. The separate admin Playwright suite, Firefox,
and WebKit were not run for this change.

For the 13 October sign-out fix, the logout route now issues a 303 to the
validated public origin and expires the session cookie in the same response.
The focused route unit test passed. A live HTTP request returned 303 with the
expected Location and cookie expiry. A Chrome browser flow signed in to the
isolated local admin, signed out to the main page, and reached login when
reopening Admin. The rebuilt static preview passed its Chromium showcase check
at desktop and mobile widths, opening all three reserved notes. The public
build, content validation, lint, public and admin type checks, purpose-comment
check, and formatting check passed.

The full unit run passed 82 of 93 tests. Eleven existing admin tests could not
initialize their accounts because the current test fixture contains passwords
shorter than the 12-character minimum. The admin Playwright suite uses that
same fixture, so its new sign-out case was checked through the separate live
Chrome flow above. Firefox and WebKit were not run. The showcase update was
executed with `node --import tsx scripts/update-showcase-notes.ts` because the
`tsx` command could not open its IPC pipe inside the sandbox. Only the three
reserved sample records changed in source content; their IDs, slugs and
`sample` statuses remained unchanged. No personal note, profile, or uploaded
asset was changed.

For the Admin navigation change, `npm run format:check`,
`npm run comments:check`, lint, public and admin TypeScript checks, all 93 unit
tests, content validation, the static preview build, and the admin server build
passed. The focused admin Chromium browser suite passed 2 checks: an anonymous
visitor could use the main navigation to reach login, and a signed-in admin
could return from the public page to the content desk. The navigation stayed
visible without horizontal overflow at 320, 390, 768, and 1440 pixels. The
static export check passed with no Admin link or private admin route. Both
desktop and mobile Chromium showcase checks opened all three notes in the
rebuilt preview. Firefox and WebKit were not run for this change.

`npm run showcase:update -- "Add an Admin link to the combined site's main
navigation and footer"` updated only the three reserved sample notes. Their
IDs, slugs, and `sample` statuses remain unchanged. No profile, personal note,
uploaded asset, or managed illustration changed. The generated social image
was restored after the build. No note was published.

For the earlier 12 October account change, `npm run format:check`,
`npm run comments:check`, lint, public and admin TypeScript checks, all 93 unit
tests, the static preview build (including content validation), and the admin
server build passed. Both public showcase browser checks passed on desktop and
mobile Chromium against the rebuilt preview, opening all three sample notes.
The full admin Chromium suite passed 29 checks using isolated content and auth
files. After adding confirmed email changes for the other account, the focused
two-case admin browser suite passed again. Firefox and WebKit were not run for
this change.

`npm run showcase:update -- "Protect the content desk with two fixed admin
accounts, session revocation, and Resend password recovery"` refreshed the
same three reserved notes. All remain `sample`. A Git content review found
changes only in those three note JSON files; no profile, personal note,
uploaded asset, or managed illustration changed. The generated social image
was restored after the static build. No note was published.

Live Resend delivery and a hosted production deployment were not verified:
this workspace has no configured sending domain, API key, or deployment target.
The unit tests verify the recovery and session behavior with a mocked Resend
response; browser tests use a local development server.

Visual evidence: [nested points on desktop](writing-workflow/nested-points-desktop.png), [centered image on mobile](writing-workflow/centered-image-mobile.png).

## CR: Profile monogram browser icon — 13 October 2026

The browser tab icon now follows the saved profile monogram on the combined
site and after each static rebuild. The metadata uses an encoded SVG, so an
updated monogram has a distinct icon URL without changing a public asset by
hand. The three sample checklists describe the expected saved-profile flow;
verification is recorded above.

## CR: Private admin account refresh — 13 October 2026

The two fixed account slots were updated only in the private auth JSON. Their
passwords were hashed, and previous sessions and recovery links were revoked.
The showcase checklists explain the expected sign-in behavior without including
actual account details. Verification is recorded above.

## CR: Private environment configuration — 13 October 2026

The local web app now has a Git-ignored, owner-readable `.env.local` for admin
origin and the existing auth file path. The template and README explain where
to provide Resend settings and one-time bootstrap passwords, and to remove
bootstrap passwords once the hash file exists. The three sample checklists now
identify this boundary. Verification and the live admin browser limitation are
recorded above.

## CR: Password visibility and local sign-in — 13 October 2026

Admin password fields now provide Show and Hide actions for the value being
typed. The local login reads hashed credentials from the private auth JSON;
the fixture under `tests/fixtures/` is used only by tests. The README now
identifies that boundary. After the owner supplied longer passwords, the
running preview's two fixed accounts were synchronized with the private auth
JSON. Verification is recorded above.

## CR: Return home after admin sign out — 13 October 2026

Signing out now revokes the current session, expires its browser cookie, and
opens the public main page. The redirect response is built with the cookie
header at creation because a standard `Response.redirect` has immutable
headers in this runtime. The destination uses the validated request host so
the browser stays on the origin it used to open the site. The three sample
checklists include this path; verification and the fixture limitation are
recorded above.

## CR: Admin link in combined site navigation — 12 October 2026

The combined site now shows Admin in its main navigation and footer to every
visitor. The protected route sends a signed-out visitor to login and opens the
content desk for a signed-in admin. The public static export omits the link
because it has no admin routes. The same three sample checklists now cover the
visitor-to-login and signed-in return paths. Validation results are above.

## CR: Fixed admin accounts and password recovery — 12 October 2026

The content desk now requires a server-side session for every admin page,
write API, image original, and workbook API. Two fixed account slots are
initialized with private JSON password hashes. Admin management lists both,
edits their display names, requests confirmed email changes, and removes or
restores the other account's access;
the current account cannot remove itself. Password changes, Resend recovery,
and confirmed email changes revoke older sessions. The JSON file must live on
private persistent storage served by one writer.

The public static export still excludes admin routes. A separate server build
serves visitors and authenticated admins on one origin, including visitor
media and protected draft previews. The three sample checklists now cover
sign-in, account management, and navigation; automated checks cover token and
session rules. The validation results and delivery limits are recorded above.

## CR: Substantive standards review — 9 October 2026

The 8 October pass established formatting and comment gates. This review
inspected the public and admin boundaries, content schemas, save and upload
flows, workbook persistence, scripts, tests, styling conventions, dependency
setup, and generated-output exclusions against the shared rules. Its detailed
scope and findings are in `ENGINEERING_STANDARDS_AUDIT.md`.

Admin save handlers now validate the returned record and version before
marking profile, research, or notebook-order drafts as saved. Malformed HTTP
success payloads leave the draft editable and show a reload/retry message.
Image and workbook editors validate upload and preview payloads before use.
The workbook preview contract is shared by the worker result, persisted
metadata, and browser response; corrupt saved metadata is treated as an
unavailable attachment. Regression tests cover these cases.

The same three sample notes gained checks for malformed save/upload responses
and corrupt workbook previews. `npm run showcase:update -- "Audit codebase
standards and validate admin responses and saved workbook previews"` succeeded.
All three remain `sample`. A SHA-256 comparison of 19 source-content files
found only their three JSON records changed. Profile, personal notes, workbook
sources, uploaded images, and both managed sample illustrations remained
byte-identical. No note was published.

The final Prettier and purpose-comment checks, ESLint, public/admin type
checks, 87 unit tests, content validation, and static preview build passed.
The 9 October dependency audit reported zero production advisories and five
high entries in the development-only Next ESLint chain.
The full public desktop/mobile Chrome suite passed 39 checks and skipped one
desktop touch-only case; both showcase tests opened all three notes on the
rebuilt preview. The full admin Chrome suite passed 27 checks against isolated
content, including the malformed-save response regression. Firefox and WebKit
were not run because their executables are unavailable locally. The generated
social image was restored to its tracked version after the build. No deployment
occurred.

## CR: Codebase-wide source standards — 8 October 2026

`docs/coding-standards.md` now requires short purpose comments in maintained
source, scripts, tests, and styles, plus explanations for non-obvious behavior.
All 108 maintained source/script/test/stylesheet files have purpose
comments and were formatted with pinned Prettier `3.9.9`; the check covers
113 code files when web configuration is included. Focused comments
explain validation, upload rollback, editor behavior, and stylesheet sections.
The format and opening-comment checks are part of CI. Generated Next.js manifests and private content
remain outside the formatter's scope. The same three reserved sample notes
were updated with a latest-change checklist, using `npm run showcase:update --
"Standardize maintained source formatting and comments and patch Next.js"`.
Their status remains `sample`.

The dependency audit also found a newly reported advisory on Next.js `16.3.6`.
The compatible `16.3.8` patch and matching ESLint config were installed.
Afterward, `npm audit --omit=dev` reported zero advisories. The full audit
reported five high entries in one development-only Next ESLint dependency
chain; it is not a clean full-tree audit.

The Prettier and purpose-comment checks, lint, public/admin type checks, all 84 unit tests, content
validation, and the `npm run build` preview export passed after the patch.
The public desktop/mobile Chrome run passed 39 checks with one desktop touch
case skipped, including both all-three-showcase cases. The complete admin
Chrome run passed 26 checks against an isolated content copy. The default
all-browser admin command could not start its 52 Firefox/WebKit cases because
those browser executables are not installed; its 26 Chrome cases passed, then
the explicit Chrome-only run passed cleanly. No Firefox or WebKit result is
claimed for this CR.

A SHA-256 comparison against the pre-update content found changes only in the
three reserved showcase JSON files among 19 source-content files. The other
16 files, including profile, personal notes, the personal `test` note, workbook,
and uploaded image files, remained byte-identical. Both managed showcase
illustrations remained byte-identical. No note was published or deployed.

## CR: Admin navigation source readability — 8 October 2026

`AdminNav.tsx` is maintained source. Its route predicates and JSX were expanded
for reviewability while preserving the same Overview, Profile, and View site
links and `aria-current` behavior. The shared Latest change checklist in all
three reserved showcase notes now asks readers to check active navigation on
Overview, research editors, and Profile, then use View site by keyboard and at
mobile width. `npm run showcase:update -- "Clarify admin navigation source
without changing behavior"` completed successfully.

Content validation, lint, public and admin TypeScript checks, all 84 unit
tests, and the preview build passed. Focused admin Chrome browser checks:
2 passed using the suite's isolated content copy. Focused public showcase
checks: 2 passed on desktop and mobile Chrome in the rebuilt preview. A
SHA-256 check found only the three reserved sample JSON records changed;
profile, personal notes, uploaded files, and managed illustration bytes did
not change. The generated social preview image was restored to its tracked
version after the build. No publication or deployment occurred.

## CR: Public links and local upload hardening — 7–8 October 2026

The same three reserved sample notes were updated with checks for HTTPS links
containing credentials, useful invalid-upload messages, and generic unexpected
upload errors. `npm run showcase:update -- "Audit public links and local upload
errors"` completed successfully. Public content validation now rejects
embedded credentials in source, contact, and rich-writing HTTPS links. Image
and workbook upload handlers distinguish known input errors from unexpected
server failures. This includes one-pixel images, which now receive a useful
input error. Partial upload files are removed after a metadata write
failure, without touching files that already existed.

Content validation, lint, public and admin TypeScript checks, all 84 unit tests,
and `npm run build` passed. Public browser tests on desktop and mobile Chrome:
39 passed, 1 skipped in the full run; both focused showcase checks passed after
the final note refresh. This includes loading all three refreshed samples in the
rebuilt preview and checking responsive layout, accessibility, static-export
privacy, and no-JavaScript reading. The admin suite used an isolated project
copy because the owner's local admin development server was already running:
25 checks passed in the full run; the one failed assertion assumed three fixed
release blockers and passed after correction in a focused rerun. Unit tests
cover rejected credential-bearing links, known versus unexpected upload
responses, and upload rollback. A clean full admin rerun was not completed.

The current published personal note was preserved. Two old browser assertions
that assumed every note was a sample and the release checklist always had three
blockers were corrected to use the actual content state. The public build
regenerated `public/social.png`; its unrelated generated diff was restored so
it is not part of this change. No production build or deployment was performed.


## CR: Optional citations — 28 September 2026

The published-note source minimum was removed. An omitted `sources` property defaults to an empty list. Optional entries still require titles and HTTPS links; notes without sources omit Further reading. Admin status/help copy and the workflow showcase were updated, and all three showcase notes record this CR. Validation: lint passed; all 58 unit tests passed; the create/publish/add-source workflow passed in Chromium, Firefox and mobile WebKit. A full TypeScript/production build passed with temporary approved-profile and citation-free published-note fixtures; it omitted Further reading, sample notes and admin routes. Those fixture changes were restored byte for byte. See `../LAUNCH_CHECKLIST.md` for the remaining end-to-end launch work.

The actual project preview was rebuilt successfully. A read-only live browser check verified the updated CR on all three showcase notes, optional-source copy in admin overview/new-note/editor, and the existing profile approval checkbox. No browser runtime errors occurred. SHA-256 checks confirmed all 16 other private-content files (profile, personal notes and uploaded assets) were unchanged.

## CR: Local launch checks and content recovery — 28 September 2026

All three reserved sample notes were refreshed. The workflow note now covers shared release readiness, optional citations, backup snapshots, new-folder restoration, checksum/error handling and the publishing checklist. A stale checklist mention of research filters was removed because filters are not implemented.

The actual test results and remaining owner/hosting steps are recorded in [local launch evidence](LAUNCH_TOOLS.md). Existing profile, personal notes and uploaded assets are preserved; no sample is promoted to published content.


## CR: Sand & Copper admin palette — 28 September 2026

Overview, Profile and research editing now use sand backgrounds, cream surfaces, copper actions and a dark brown admin navigation bar. Success/published states remain green and errors remain red. Public page colours, profile headline/card previews, saved article previews and custom cover artwork retain their portfolio colours. The palette is scoped to the mounted admin layout, including client navigation to View site and back. Muted text and control borders were darkened from the mockup to meet contrast requirements on tinted surfaces.

The same three sample showcase notes were updated with theme checks for formatting controls, artwork, focus, dialogs, validation and navigation. Validation: content validation and the static build passed; all 68 unit tests passed. Public and admin TypeScript checks and lint passed. Admin browser coverage: 12 artwork/profile/rich-content regression cases passed, plus all 9 theme cases in the final focused run, across Chromium, Firefox and mobile WebKit. The final run handles the editor's existing unsaved-change confirmation before opening a saved preview. All 5 public showcase browser cases passed across desktop Chromium/Firefox/WebKit and mobile Chromium/WebKit, checking all three notes at 320/390/1440 pixels. Automated accessibility checks passed on tested routes, controls and dialogs. This was focused regression coverage, not a full release qualification.

Only the three reserved sample notes changed in private content; profile, personal notes (including the owner's published note), uploads and managed image assets were preserved byte for byte. Deployment remains pending.


## CR: Automatic note numbers and card ordering — 28 September 2026

Every cover now displays FIELD NOTES / 01, 02, etc. instead of design-type or variation labels. Automatic numbers follow the full visible notebook and agree on selected home cards, the archive and articles. Cover words, colours and saved geometry stay editable and unchanged. An optional Note number override accepts whole numbers from 1 to 9999; clearing it restores automatic numbering. Drafts do not consume public numbers, and production numbering excludes samples.

Admin Overview now shows cover cards with drag handles, touch dragging, up/down buttons and keyboard arrow/Home/End movement. Save order persists the arrangement; Reset order discards unsaved moves. Escape, pointer cancellation and window blur cancel the active drag. Failed saves retain the arrangement for retry; stale tabs and incomplete/duplicate/unknown note lists are rejected. Arrangement saves atomically replace a separate private research-order.json file, preserving each note's content, publishing status and home selection. Deleted IDs are ignored; new notes follow the existing fallback until arranged. The obsolete Home order control is replaced by Show on home page; existing numeric values remain compatible.

The same three sample notes were refreshed. Formatting covers the numbered corner, images covers overrides across design choices and crops, and workflow covers arrangement, selection, reset, cancellation, conflicts and retry. No sample was published.

Validation: all 75 unit tests passed, including atomic failure handling and byte-preserving storage. Lint and public/admin TypeScript checks passed. The preview static build passed. Final focused admin browser run: 25 passed across Chromium, Firefox and mobile WebKit (16 ordering/override/selection checks plus 9 palette regression checks); 2 native-CDP-touch cases were skipped in engines without CDP. Chromium native touch dragging passed, while all three engines passed pointer and keyboard checks. The final run also checked hydration errors, widths of 320/390/768/1440 pixels and automated accessibility. Public browser checks: 15 passed across desktop Chromium/Firefox/WebKit and mobile Chromium/WebKit, covering exported cover numbers, every article, selected cards, no-JavaScript reading, private-route exclusions and all three showcase notes at 320/390/1440 pixels. This is focused change coverage, not full release qualification.

Only the three reserved sample records changed in private content. The other 16 private-content files, including profile, personal research and original uploads, were preserved byte for byte. Deployment remains pending.

The actual project preview was rebuilt successfully after installation. Read-only live Chromium checks verified all seven notebook/article cover numbers and selected home cards, admin drag handles and default/override controls, the Show on home page checkbox, and the current CR on all three sample notes. There was no overflow at the tested 320/390/1440 widths and no browser runtime errors. Live checks saved no notes or arrangement. The 31 installed files matched their staged checksums, and the other 16 private-content files remained unchanged. Visual captures are available in the local Codex visualization folder under note-order/.


## CR: Admin navigation and tags placeholder — 28 September 2026

Removed New note from the top admin navigation beside Profile. Overview retains its New research note action, and remains the active admin section when creating or editing research. Tags now displays Separate with commas. as an input placeholder; the duplicate hint underneath is removed. Tag parsing and saving are unchanged.

The same three sample notes were refreshed, with workflow checks for navigation, note creation and the Tags placeholder. Content validation, lint, admin TypeScript, the public TypeScript/static build and all 75 unit tests passed. The existing admin navigation/upload/origin regression passed in Chromium, Firefox and mobile WebKit (3 cases) using isolated content copies, including the updated entry point and placeholder assertions. Read-only live Chromium checks covered Overview, Profile, new and saved research editors, and all three rebuilt sample notes. No overflow occurred at the tested mobile/desktop widths, and no browser runtime errors occurred. All 16 other private-content files were preserved byte for byte. Deployment remains pending.


## CR: Inline spreadsheet embeds and expanded reader — 28 September 2026

Research attachments now accept published Google Sheets and generated OneDrive/SharePoint Excel viewers. The selected inline design includes Open original, Reload and Expand; expansion promotes the same iframe to a native dialog, preserving the selected sheet and current view. Close restores the inline region and focus; mobile uses the full viewport. Escape closes while a parent-page control has focus. When the cross-origin spreadsheet has focus, use the surrounding Close control. Inline iframes and original links are exported without JavaScript.

Admin Sheets & models accepts an embed URL or a single quoted-src iframe code, previews it before attachment, and saves normalized URLs. Existing attachments can add, rename, change or remove hosted viewers. Ordinary Google sharing links remain external links. Local Excel uploads keep their original downloadable bytes and custom preview when no hosted embed is supplied; clearing an optional embed restores that preview. No file is uploaded to a provider by this feature. Provider appearance, permissions and supported interaction follow Google/Microsoft settings.

Only supported HTTPS Google Sheets/OneDrive/SharePoint addresses are allowed. Pasted HTML is never inserted: only the validated iframe source is extracted. Invalid hosts, protocols, credentials, unrelated paths and oversized inputs are rejected in admin and server validation, with editable fields and accessible errors. New embed textarea labels remain stable after validation and retry. The admin test configuration now shares the parent-created disposable content folder with workers, allowing file assertions and cleanup to inspect the same content the test server edits.

The same three reserved sample notes were updated. The workflow showcase covers embed creation, preview/save/reload, expansion, mobile reading, fallback links, permissions and reverting uploads. No fabricated cloud URLs were attached to the saved showcases, and no note was promoted to published.

Validation: all 82 unit tests passed. Content validation, lint, public/admin TypeScript and static preview builds passed. Admin browser coverage: 15 distinct cases passed across Chromium, Firefox and mobile WebKit (9 embed cases in the final focused run plus 6 existing create/publish/rename/reset/trash and navigation/upload cases). Public coverage: 10 embed/no-JavaScript cases passed across desktop Chromium/Firefox/WebKit and mobile Chromium/WebKit using isolated provider fixtures; after removing those fixtures and rebuilding, all 5 three-showcase cases passed. Tests cover preservation of the same iframe and its selected worksheet across expansion, Reload, focus restoration, parent Escape, widths of 320/390/768/1440 pixels, original Excel download bytes, clearing embeds, validation retry, legacy links, accessibility, runtime errors and private/admin route exclusion. Browser tests scroll lazy-loaded viewers into view before interacting.

Provider iframe responses were intercepted with local test documents. These tests verify application behavior, not Google's or Microsoft's live access settings, sign-in, formulas, tab controls or tenant policies. Real hosted links must be checked as an anonymous visitor before release. Visual captures in the local Codex visualization folder under sheet-embeds/implementation also use a clearly identified illustrative provider document.

SHA-256 checks confirmed the other 16 private-content files, including the existing profile, personal notes and original uploads, were preserved byte for byte. Disposable embed fixtures were restored before installation. Deployment remains pending.

The actual project preview was rebuilt successfully. Read-only live Chromium checks verified the new embed controls on existing/new research editors, the current CR on all three sample notes, unchanged original workbook preview, and widths of 320/390/1440 pixels. No runtime errors occurred, and the live check saved no content. All 18 installed files matched their staged checksums, and the other 16 private-content files remained unchanged after the build.


## CR: Browser extension body hydration warning — 28 September 2026

The reported mismatch contained only an extra cz-shortcut-listen="true" body attribute, absent from application source. A browser init script reproduced the exact warning before the fix. RootLayout now sets suppressHydrationWarning only on body, tolerating extension-added attributes on that element. Rendering remains server-side and deterministic; no extension markup is added, removed or executed by the application. Descendant hydration mismatches remain checked, consistent with React's single-level escape hatch ([React hydration reference](https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors)).

The same three sample notes were refreshed, and workflow adds a reload/editing check for extension-modified browser documents. Profile, personal notes and uploaded content were preserved.

Validation: content validation, lint, public/admin TypeScript and the static preview build passed; all 82 unit tests passed. The targeted admin regression passed 6 cases in Chromium, Firefox and mobile WebKit, covering clean documents and an extension-like body mutation before hydration. Each checks saved research, New note and Profile, editable fields, dirty-state updates and explicit Reset edits without saving content. All 5 public showcase cases passed across desktop Chromium/Firefox/WebKit and mobile Chromium/WebKit. The exact warning was reproduced before the change and was absent in the final simulated-extension run. This verifies the supplied attribute mismatch rather than installing a real browser extension. No broader hydration warnings were suppressed.

The actual preview was rebuilt and read-only live Chromium checks passed on all three admin editors with cz-shortcut-listen injected before hydration: zero hydration warnings or runtime errors. All three rebuilt sample notes show the current CR. The live check saved no content; all 16 other private-content files remained unchanged after the build.

## CR: Reflective card journey and portfolio palette — 18 October 2026

The public home now opens with the editable portfolio title and short description above a reflective Three.js card. Its rounded face mask matches the curved 3D body. Compact spreadsheet cells reveal faint Excel-style formulas inside the hovered cell. GSAP scroll progress turns and docks the card, raises dashboard bars and other chart widgets, then blurs the dashboard as the editable research introduction appears. The research index, articles and admin use the navy `#00007F`, bright yellow and green palette. Reduced-motion visitors receive the card, dashboard and research introduction in document order. The card has a flat fallback when WebGL is unavailable.

Profile admin now edits Portfolio title, Introduction and both Research introduction lines, and shows an in-form journey preview. These save through the existing validated, versioned profile API and appear in the public header, hero, card, handoff and metadata as appropriate. Existing profile JSON remains valid with display-name and research-line fallbacks. The legacy headline values were preserved in the profile and removed from the home editor because the new hero uses the portfolio title.

The same three reserved showcase notes (`qa-formatting`, `qa-images`, `qa-workflow`) were refreshed with the change description and checks for the card, grid, dashboard, public pages and admin fields. They remain `sample`. A SHA-256 comparison before and after `showcase:update` found all 16 other private-content files unchanged; no additional notes were created or published.

Validation: `format:check`, `comments:check`, lint, public/admin TypeScript checks, 102 unit tests, content validation and the static preview build passed. The public Chromium site suite passed 14 cases with one platform-specific touch case skipped; it covered formula cell containment, staged dashboard and blur, navigation, narrow widths, no-JavaScript reading and accessibility. The three-showcase Chromium browser check passed at mobile and desktop widths. The isolated admin Chromium palette suite passed four cases, including a save/reload/public-render round trip for the four editable fields and accessibility checks. The admin test server initially timed out because the local `ADMIN_ORIGIN` targeted port 3000; its isolated configuration now explicitly sets its own port 4186. Two measured contrast issues in the new palette were corrected before the passing run. The rebuilt local preview was visually inspected at the hero, dashboard and rounded card corners. Browser checks used a local preview and isolated test content, not a deployed site.

## CR: Continuous navy grid and simplified home — 18 October 2026

The blue `#00007F` spreadsheet grid now belongs to the shared page background. It stays visible through the header, card journey, selected research, research index, article pages and footer. The hero's local grid paint was removed while its cell hover formulas remain. Research cards and article text use light reading panels; the admin uses the grid around solid editor panels. A stable admin-shell marker keeps public reading styles out of saved-note previews.

The public home About and Contact sections and their navigation links were removed. Their profile fields remain saved and editable, clearly marked as hidden in admin. The release notice no longer suggests adding contact details for a public section that is not shown. The same three reserved showcase notes were updated by `showcase:update` and remain `sample`. SHA-256 comparison found every other private-content file unchanged.

Checks completed: `format:check`, `comments:check`, lint, public/admin type checks, 102 unit tests, content validation and a static build passed. The public Chromium suite passed 15 cases with one platform-specific native-touch skip; it includes the three rebuilt showcase notes, responsive widths, accessibility, grid formulas and navigation. The isolated admin rich-content checks passed two cases, including save/reload of hidden profile content. The final focused admin palette suite passed four cases, including accessibility, mobile widths, public rendering and the saved-article preview. Visual inspection of the rebuilt local preview confirmed the grid across the home, index, article and footer, with legible research cards and article body.

The final static rebuild after the admin style-scoping correction and removal of unused navigation CSS was not executed: automatic approval review rejected the build command because the account reached its usage limit. This was a review availability failure, not a code safety finding. The current local preview reflects the shared grid and section removal, but it predates those final CSS-scoping edits. The final preview should be rebuilt and its public/admin browser checks rerun when approval review is available.

## CR: Portfolio content desk — 19 October 2026

The admin Overview now presents a compact card preview, real published/draft/release counts, smaller research rows with the existing reorder controls, a Homepage summary, and release blockers before optional detail. The blue grid remains visible behind its panels. `/admin/home/` gives the portfolio title, hero description and research introduction a direct editing route; Profile shows identity, release approval and preserved About/Contact content. Both focused views use the same validated, versioned profile save flow. The three reserved showcase notes were refreshed and remain `sample`; no other private content record or upload changed.

Checks passed: `format:check`, `comments:check`, lint, TypeScript, content validation, 102 unit tests, a fresh static preview build and the admin server build. The rebuilt export contains all three showcase pages with this CR and contains no admin route. Focused admin Chrome checks passed 10 of 11 cases in the first executable-browser run; the remaining case had an older light-background assertion. After updating that assertion for the approved navy grid, it passed on rerun. These checks covered responsive widths, accessibility, homepage save to public rendering, release links, saved article colours, and pointer, keyboard and touch ordering. Playwright's bundled Chromium was absent, so the run used the installed Google Chrome binary. The live admin Overview and Homepage editor were visually inspected on the combined local server; the local admin was restored at port 3000. No production release or deployment was performed.

## CR: Compact pattern thumbnail — 19 October 2026

The `Evidence in pictures` sample uses a 192-pixel jigsaw tile. The 104-pixel admin research thumbnail previously exposed only a cropped fragment. The admin thumbnail now repeats a 56-pixel tile centered in its frame; the saved cover and full-size public artwork are unchanged. The shared checklist in `web/src/lib/showcase-notes.ts` now asks readers to inspect this compact preview. `showcase:update` refreshed only the three reserved sample notes; they retain `sample` status.

Checks passed: `format:check`, `comments:check`, lint, TypeScript, all 102 unit tests, content validation and a fresh static preview build. All three rebuilt showcase pages contain the current change description. The live admin browser showed complete repeated puzzle pieces in the `Evidence in pictures` row, and computed style confirmed the 56-pixel centered tile. `git diff --check` passed. No other content record or upload was edited for this CR.

## CR: Classic ivory and brass palette — 19 October 2026

The shared portfolio palette now pairs warm ivory reading and editing surfaces with restrained brass accents, the existing navy grid, and a deeper green for stronger contrast. The public research cards and article panels use the warm surface and brass-toned borders; the reflective card and dashboard use warmer platinum and champagne details. Admin overview and editor surfaces share the ivory treatment while keeping navy navigation and brass active/focus accents. The same three reserved sample notes were refreshed and remain `sample`; content validation reports seven visible preview notes.

Checks passed: `format:check`, `comments:check`, lint, public and admin TypeScript, 102 unit tests, content validation, static public build, admin production build, and `git diff --check`. The public Chromium suite passed 20 tests with one platform-specific native touch case skipped, including responsive layout, home scroll sequence, showcase notes, and accessibility. The sheet-embed contrast check passed after a first full run identified old built CSS; the current rebuilt export now passes all sheet checks. The isolated admin browser suite could not start because the already-running local admin process holds the shared `.next-admin` dev lock; its production build passed. Profile and other personal content were preserved by the showcase updater; no publish or deployment occurred.

## CR: Unsplash image search — 19 October 2026

The research cover picker now has an Unsplash search tab. Search requests use an authenticated admin route and a server-only `UNSPLASH_ACCESS_KEY`. Selected photos stay hotlinked to the Unsplash CDN, photographer and Unsplash credits appear on public note cards and articles, and selection calls the API's `download_location`. Cover validation and export generation support these remote images without copying them into local assets. The same three reserved notes were updated and remain `sample`.

Checks passed: `format:check`, `comments:check`, lint, public/admin TypeScript, 104 unit tests (including mocked search, attribution, download tracking and invalid-host coverage), content validation, static public build, admin production build, and `git diff --check`. The public Chromium suite passed 20 tests with one platform-specific native touch case skipped; all three rebuilt showcase pages loaded. Live Unsplash search was not verified because no `UNSPLASH_ACCESS_KEY` is configured. The admin browser suite could not start because the user's existing local admin process holds the shared `.next-admin` development lock. No personal notes or uploaded images were changed; no note was published.

## CR: Unsplash search form hydration fix — 19 October 2026

The Unsplash search control in Cover artwork is now a `role="search"` region with a button-driven search action, so it remains valid inside the research editor form. The hydration browser test now opens Unsplash on the new-note page and asserts that no `form` is nested inside another `form`. The same three reserved showcase notes were refreshed and remain `sample`.

Checks passed: `showcase:update`, `validate:content`, `format:check`, `comments:check`, lint, public/admin TypeScript checks, and all 104 unit tests. In the authenticated live admin tab at `/admin/research/new/`, the Unsplash search region, search field and Search button were present after hot reload. The automated admin browser suite was not rerun because it starts a separate Next admin server that shares the `.next-admin` development lock with the user's running admin server. The new hydration assertion is in `tests/admin/hydration.spec.ts`; no live Unsplash request or note save was performed.

## CR: Footer scroll boundary — 19 October 2026

The shared blue grid remains visible, while the root page now prevents vertical rubber-band overscroll so a fast scroll cannot leave a large empty grid below the footer. The same three reserved showcase notes were refreshed with a footer check and remain `sample`; no other source-content record was edited.

Checks passed: `showcase:update`, content validation, `format:check`, `comments:check`, lint, public/admin TypeScript, all 104 unit tests, the static preview build, and `git diff --check`. The rebuilt preview's showcase browser check passed in installed Chrome across all three notes at 320, 390 and 1440 pixels, including accessibility. Two public Back to top browser checks passed. The first Playwright attempt could not launch its absent bundled Chromium; the rerun used the installed Google Chrome executable. In the live admin new-note page, browser inspection at 1548×548 and 390×844 confirmed the footer reached the viewport bottom at the scroll limit, root vertical overscroll was `none`, and the mobile page had no horizontal overflow. The isolated admin browser suite was not run while the user's admin server held its development build directory. No note was published or deployed.

## CR: Contact, résumé and certifications — 19 October 2026

Profile now edits contact links, a PDF résumé and repeatable certifications. The résumé has an upload control, public label and visibility setting. Uploaded PDFs stay in private content storage until a saved profile selects one for public download; hiding or removing the link removes the generated public copy. Certifications have issuer, dates, optional credential ID and verification URL, order controls and individual visibility. The public site renders saved details in a compact section after the page content; an empty profile keeps the section hidden. Existing profile data parses with empty certifications and a hidden résumé. The three reserved showcase notes were refreshed with this CR, retain their reserved IDs and `sample` status, and were verified in the rebuilt preview. Git status showed no changed profile file, personal note, or uploaded content asset; the sample PDF from the isolated upload browser check was removed.

Checks passed: content validation through the Node `tsx` loader, `format:check`, `comments:check`, lint, public and admin TypeScript, all 110 unit tests, the static preview build, and `git diff --check`. The rebuilt public Chrome checks passed for the three showcase notes at mobile and desktop widths and for page rendering at 320–1440 pixels. Three isolated admin Chrome checks passed: add/reset without save, save/reload/public rendering of links and certifications, and private PDF upload, publication, and removal. The populated contact section fit at 320, 390 and 1440 pixels. Playwright's bundled Chromium was absent, so these checks used installed Google Chrome. The repository `tsx` command was blocked from opening its local IPC socket by the sandbox; equivalent scripts ran successfully with `node --import tsx`. No content was published or deployed.
