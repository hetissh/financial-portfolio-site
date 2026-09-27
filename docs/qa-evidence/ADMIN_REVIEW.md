# Admin and spreadsheet review — 27 September 2026

Claude's local file-based admin was reviewed and extended without changing the site's static export architecture.

## Results

| Check | Result |
| --- | --- |
| ESLint | Passed |
| Type generation and TypeScript | Passed |
| Unit tests | 36 passed across 4 files |
| Optimized static build | Passed; 3 example research pages and 1 example workbook |
| Public browser suite | 61 passed, 4 intentional skips across desktop Chromium, Firefox, WebKit, mobile Chromium and mobile WebKit |
| Admin browser suite | 9 passed across Chromium, Firefox and mobile WebKit |
| Automated axe checks | Passed on tested public/admin pages, including the workbook viewer |
| Installed-project build and live smoke | Passed: admin on port 3100, workbook preview/tabs, static download MIME/bytes, and admin exclusion on port 4173 |
| Screenshot viewport overflow | None at the captured 320, 390 and 1440 px widths |

The four skips belong to a CDP native-touch test that runs only in mobile Chromium. Browser profiles emulate devices; actual-phone and screen-reader checks remain outstanding. Automated axe results do not establish full accessibility conformance. No approved visual baseline exists, so visual regression comparison is **INCONCLUSIVE**. Screenshots received a manual layout inspection.

## Fixes and additions

- Recoverable network failures instead of a permanently busy save button.
- Explicit Reset edits, unsaved-link/close prompts, and disabled controls during saves/uploads.
- Versioned writes that reject stale-tab saves/deletes with HTTP 409.
- Stable editor identity after slug changes, refresh-aware navigation, and working newly published local URLs.
- Bounded JSON bodies, atomic record writes, validation of stored records, non-reused IDs in trash, and containment checks for local files.
- Excel attachment upload, names, previews, sheet selection, cached values/formulas, original downloads and Google Sheets links.
- Workbook parsing in a bounded worker, ZIP/decompression checks, upload limits, and rejection of macros/external workbook links.
- Workbook export restricted to visible notes; private source files and all admin routes stay absent from the static export.
- An explicitly fictional two-sheet workbook attached to the Beyond the bottom line example.

## Browser coverage

Admin journeys create and validate drafts, upload Excel, attach Google Sheets, preview drafts, publish with sources, access new URLs, rename and save again, reset/cancel navigation, handle network failures, reject stale-tab writes, save with a keyboard shortcut, and move notes to trash. Tests also reject cross-origin requests and invalid uploads. They edit disposable copies of content.

Public journeys cover direct links/refresh, real 404s, repeated Back to top, normal scrolling and history, research-rail controls, keyboard access, no-JavaScript reading, accessibility, workbook values/formulas/tabs/download bytes, and exclusion of admin APIs/private workbook sources.

## Evidence

- [Desktop admin](admin-review/admin-desktop.png), [mobile admin](admin-review/admin-mobile.png).
- [Desktop sheet editor](admin-review/editor-desktop.png), [mobile sheet editor](admin-review/editor-mobile.png).
- [Desktop workbook](admin-review/workbook-desktop.png), [320 px workbook](admin-review/workbook-small-mobile.png).
- [Viewport observations](admin-review/viewports.json).

Screenshots use the local development server, so the Next.js development indicator is visible. Static export checks used the optimized build.

## Remaining release work

Provide approved profile/contact content, replace example notes/workbooks with actual research, complete actual-device and screen-reader checks, then choose a domain and host. The current preview is non-indexable and no public deployment has been made. Excel previews use cached values and do not recalculate formulas; Google Sheets access follows existing sharing permissions. Saved changes update the local admin server immediately; the static preview needs a rebuild.
