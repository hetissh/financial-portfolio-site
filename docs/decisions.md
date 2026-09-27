# Implementation decisions

26 September 2026

| Decision | Basis |
| --- | --- |
| Implement the public finance/research portfolio | User accepted the plan and requested implementation |
| Use the corrected `personal_projects` path | User supplied the new path while implementation was in progress |
| Create an editorial visual design | Original source and screenshots were unavailable; the cached conversation only establishes responsive layouts, research cards, and scrolling problems |
| Warm paper, forest ink, Instrument Serif + DM Sans | Chosen design direction for a readable research portfolio; fonts are bundled locally |
| Render static pages with Next.js App Router | Agreed plan; no account system, financial feeds, or runtime database are required |
| Include three explicitly labeled sample notes | The owner has not yet supplied research; samples demonstrate reading and navigation without inventing credentials or investment results |
| Omit résumé and contact links until provided | Avoid false addresses and dead download buttons |
| Keep the document as the sole vertical scroller | Address the known mobile scrolling failure |
| Use native rail scrolling and explicit Back to top | Preserve normal touch behavior and reliable repeated activation |
| Separate preview and production content | Samples remain visible locally; drafts never render; production excludes samples and requires completed profile/content |

## 27 September 2026: local admin

| Decision | Basis |
| --- | --- |
| Add a local-only content editor at `/admin` (`npm run admin`) | Owner asked for an admin page and chose a local editor over a hosted admin with Postgres or a Git-based CMS. The static export, hosting plan, and "no backend" release decision are unchanged |
| Gate admin routes with `pageExtensions` (`*.admin.tsx`) in a separate dev-server mode with its own `distDir` and tsconfig | Static export supports neither non-GET route handlers nor Server Actions. The separate mode keeps admin routes and their generated types out of `next build` and `npm run typecheck` |
| Validate every save against the full collection using the build schema; write atomically; trash instead of delete | The admin can't produce content that fails the build, and nothing is committed to git yet, so removals must be recoverable |
| No login; require local Host, same-origin Origin, and JSON bodies for writes | Blocks cross-site requests and DNS rebinding from other pages open in the owner's browser. The server binds to 127.0.0.1 only |

Estimate impact: none on the public release. The admin doesn't change the content contract. Affected phases: P2 (content workflow) and handover documentation.

Two implementation defects were found during browser/visual validation: rail snap padding made Previous appear enabled on load, and a `minmax` mobile column rule compressed the research cards. Snap offsets and fixed-percentage mobile column widths were corrected and regression checks added.

Test harness adjustments: macOS WebKit uses Option+Tab for link navigation; arrow tests await asynchronous control-state updates; history tests allow native scroll restoration after the header has been scrolled into view.

A final render measurement also revealed an article font-swap layout shift. Next.js local font loading with preloading and size-matched fallbacks eliminated measured CLS in the final local runs.


## Local admin and research workbooks — 2026-09-27

Retained Claude's local file-based admin and static public export. The `.admin.tsx` / `.admin.ts` routes exist only with `PORTFOLIO_ADMIN=1` on the development server, with a separate `.next-admin` directory and admin tsconfig. Local Host/Origin checks protect writes; the exported website has no admin routes.

The review fixed network failures leaving forms in Saving, unsaved navigation through Next links, stale-tab overwrites, editor state resetting on a slug rename, and newly published local URLs remaining unavailable. Saves/deletes use content hashes through If-Match; form controls are disabled during saves. Removed IDs are reserved by checking the trash before assigning another ID.

Added Excel uploads parsed in a bounded worker using SheetJS 0.20.3 from its official distribution. Archive checks precede decompression, and previews are capped at 12 visible sheets, 200 rows, and 30 columns. Values are cached Excel values; formulas are shown as data and do not execute or recalculate. The original download can contain hidden sheets/rows. Google Sheets attachments are validated sharing links and open externally.

Source workbooks stay inside src/content/workbooks. The export generator owns public/downloads/workbooks and includes only workbooks belonging to visible notes. Publishing in the editor changes source files; deployment remains a separate release step.
