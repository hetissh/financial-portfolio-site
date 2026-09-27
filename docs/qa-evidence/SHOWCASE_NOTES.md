# Three maintained showcase notes

Updated for the 28 September 2026 change request: visible bullet markers, Shift+Enter nesting, clipboard image paste and centered article images.

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

- Content validation, lint and TypeScript build passed. Unit tests: 58 passed, including safe repeated showcase updates and collision refusal.
- Public browser suite: 76 passed, 4 engine-specific touch checks skipped. Chromium, Firefox, Safari, mobile Chromium and mobile Safari covered routes, navigation, sheets, export privacy, accessibility and the three showcases at 320/390/1440 pixels.
- Admin browser coverage: all 31 applicable checks passed across the final regression run and focused rerun (13 writing/profile/clipboard checks passed in the focused rerun after the link-dialog focus fix; 18 other cases passed in the regression run). Two native-clipboard engine checks are intentionally skipped. Includes research create/publish/rename/reset/trash, stale tabs, workbooks, cover artwork, profile/About/Contact and all new writing behaviors.
- Additional reading check: all three notes work without JavaScript; article originals and private image endpoints return 404 in the static preview.
- Cross-browser file paste events cover PNG, JPEG and WebP, descriptions/captions, cancellation, unsupported/oversized files, server errors and retry. A separate Chromium test exercises native clipboard write and keyboard paste. Native clipboard permissions are not automated in Firefox/Safari; their application paste handlers are covered with file-bearing events.
- Hardware keyboard Shift+Enter is handled before the iOS Enter fallback, which otherwise drops Shift. Ordinary Enter is unchanged; outside a list, Shift+Enter adds a soft break. Tab/Shift+Tab and toolbar nesting work; five levels are allowed to keep documents within the saved-content depth limit.
- Rapid typing does not replay earlier React editor updates. Reset remains explicit. Server-rendered admin controls wait for hydration so the first field edit is not lost.
- Images are centered in the editor, admin preview and static article, including older inline paragraphs and images pasted into headings. Text order is preserved and figures are rendered outside paragraphs/headings.

Visual evidence: [nested points on desktop](writing-workflow/nested-points-desktop.png), [centered image on mobile](writing-workflow/centered-image-mobile.png).


## CR: Optional citations — 28 September 2026

The published-note source minimum was removed. An omitted `sources` property defaults to an empty list. Optional entries still require titles and HTTPS links; notes without sources omit Further reading. Admin status/help copy and the workflow showcase were updated, and all three showcase notes record this CR. Validation: lint passed; all 58 unit tests passed; the create/publish/add-source workflow passed in Chromium, Firefox and mobile WebKit. A full TypeScript/production build passed with temporary approved-profile and citation-free published-note fixtures; it omitted Further reading, sample notes and admin routes. Those fixture changes were restored byte for byte. See `../LAUNCH_CHECKLIST.md` for the remaining end-to-end launch work.

The actual project preview was rebuilt successfully. A read-only live browser check verified the updated CR on all three showcase notes, optional-source copy in admin overview/new-note/editor, and the existing profile approval checkbox. No browser runtime errors occurred. SHA-256 checks confirmed all 16 other private-content files (profile, personal notes and uploaded assets) were unchanged.

## CR: Local launch checks and content recovery — 28 September 2026

All three reserved sample notes were refreshed. The workflow note now covers shared release readiness, optional citations, backup snapshots, new-folder restoration, checksum/error handling and the publishing checklist. A stale checklist mention of research filters was removed because filters are not implemented.

The actual test results and remaining owner/hosting steps are recorded in [local launch evidence](LAUNCH_TOOLS.md). Existing profile, personal notes and uploaded assets are preserved; no sample is promoted to published content.
