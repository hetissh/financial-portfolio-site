# Three maintained showcase notes

Latest update: 9 October 2026 — substantive standards review and admin response validation. Earlier change evidence is retained below.

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

For the latest standards review, the Prettier and purpose-comment checks, lint,
both TypeScript checks, content validation, the Next.js `16.3.8` static preview
build, and all 87 unit tests passed. Public browser tests on desktop and
mobile Chrome passed 39 checks with one desktop touch check skipped. Both
showcase cases opened all three rebuilt sample notes. The full admin Chrome
suite passed 27 checks using isolated content. Firefox and WebKit binaries
were unavailable for this run; earlier cross-browser results below are
historical.

The latest showcase update kept all three notes at `sample`. A SHA-256
comparison showed only those three note JSON files changed among 19
source-content files; the other 16 files, including profile, personal notes,
and uploaded assets, remained byte-identical. The two managed illustration
files also remained byte-identical. No note was published.

Visual evidence: [nested points on desktop](writing-workflow/nested-points-desktop.png), [centered image on mobile](writing-workflow/centered-image-mobile.png).

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
