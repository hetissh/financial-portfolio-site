# Engineering standards audit — 7–9 October 2026

This is a local review of the current checkout against the attached engineering,
testing, security, frontend, backend, and TypeScript/JavaScript rules. The rules
in `docs/ai-rules/` are guidance; `AGENTS.md`, `web/AGENTS.md`, the actual
architecture, and existing project decisions govern this repository. The review
began with the public content boundary, local admin uploads and file writes,
dependency state, test assumptions, and the repository's documented gates.
The 8 October formatting pass established layout and comment coverage; it did
not establish substantive conformance across the codebase. The 9 October
review below traces the implemented boundaries and fixes concrete gaps. It
is not a proof that every path is defect free.

The reviewed coding standards apply to maintained files. The Next.js build
trees `web/.next/` and `web/.next-admin/` contain framework-generated output,
including client-reference manifests; Git and ESLint ignore them. Their
machine-formatted contents are not evidence of a source-style violation.

On 8 October, a codebase-wide maintained-code pass formatted all 108 source,
script, test, and stylesheet files, added purpose comments, and added focused
comments explaining non-obvious contracts and failure paths. Prettier `3.9.9`
is pinned, configured, and checked in CI. CI also checks maintained code
files for an opening purpose comment. Source comments remain a review
requirement because a mechanical check cannot judge whether an explanation is useful.

## 9 October substantive review

The repository inventory contains 110 maintained source, script, test, and
stylesheet files plus five web code configuration files. Format, opening
comment, lint, and strict TypeScript checks cover that maintained code. The
attached six relevant rule files match the copies in `docs/ai-rules/`; Python
rules do not apply to this TypeScript/JavaScript project. The manual review
traced these source groups against their actual callers and tests:

| Area | Review and outcome |
| --- | --- |
| Public/export boundary | Reviewed Next configuration, public routes/components, content filtering, asset and discovery generators, and preview serving. The admin remains excluded from static output; browser checks cover visible routes, no-JavaScript reading, accessibility, responsive widths, and private asset exclusion. Generated `.next`/`.next-admin` output remains outside source-style rules. |
| Admin request and persistence boundary | Reviewed Host/Origin/body-size guards, versioned profile/research/order saves, upload handlers, file-backed writes, trash, and backup/restore. Existing validation and rollback tests cover stale writes, bad input, upload failure, and safe recovery. No repository-wide rename or new persistence layer was warranted. |
| Browser editors and API responses | Found successful JSON responses cast directly to saved profile, note, and order types. Those paths now validate the record and 64-character version before clearing the dirty state. The shared request helper rejects malformed success payloads. Image and workbook editors validate returned upload data before using it. A Chrome browser regression verifies that an invalid response leaves profile edits available for retry. |
| Workbook data contract | Found persisted workbook metadata parsed as trusted JSON. A shared bounded preview schema now validates worker messages, saved metadata, and browser responses. Corrupt metadata returns an unavailable attachment rather than malformed rows or a broken download filename. Unit regressions cover malformed previews and response data. |
| Frontend and CSS | Reviewed admin navigation, form state, focus/keyboard handling, provider frames, artwork, article rendering, CSS tokens and responsive sections. Existing browser suites exercise the critical flows. Large editor and stylesheet files have distinct responsibilities and section comments; size alone is not a reason to split them. |
| Tooling, tests, and dependencies | Reviewed npm scripts, Node/Next versions, CI, ignored/generated paths, test organization, and secret-bearing file patterns. No committed secret candidate was found by the repository scan. On 9 October, `npm audit --omit=dev` reported zero advisories; full `npm audit` reported five high entries in the development-only Next ESLint dependency chain. |

Verification after the 9 October changes: Prettier, opening-comment check (115
files), ESLint, public/admin type checks, 87 unit tests, content validation,
and the static build passed. Public desktop/mobile Chrome: 39 passed, one
desktop touch-only check skipped. Admin Chrome: 27 passed against isolated
content. Both public showcase checks opened all three rebuilt sample notes.
Firefox and WebKit executables were unavailable locally. The three reserved
showcase JSON files were the only changed source-content files among 19;
profile, personal notes, uploaded assets, and managed illustrations matched
their pre-update SHA-256 hashes.

## Earlier 8 October baseline

| Standard | Evidence and result |
| --- | --- |
| Engineering and architecture | The project has a static public export, a local-only admin, file-backed content contracts, isolated browser fixtures, and CI gates. `docs/architecture.md` and `docs/coding-standards.md` describe the verified setup. The requested repository-wide formatting and commenting pass now has an automated format check. |
| Security | Public HTTPS source, contact, and rich-writing links now reject embedded URL credentials. Known invalid image/workbook input, including images too small to crop, returns a useful 400; unexpected upload errors are logged locally and return a generic 500 instead of exposing internal paths or parser details. Existing local Host/Origin, size, and content validation guards were retained. |
| Backend and persistence | Image and workbook writes now roll back only files actually created if a later write fails. This prevents orphaned uploads and avoids deleting a pre-existing file during a rare identifier collision. Regression tests cover rollback after metadata write failure. |
| Frontend and accessibility | The rebuilt preview and desktop/mobile Chrome browser suite exercised routes, sample-note presentation, responsive reading, no-JavaScript content, static export privacy, and automated accessibility checks. Existing keyboard/focus behavior was preserved. |
| TypeScript and testing | Format and purpose-comment checks, ESLint, public and admin type checks, 84 unit tests, content validation, and the Next.js `16.3.8` static build passed. The public desktop/mobile Chrome suite passed 39 checks with one desktop touch check skipped. The full admin Chrome suite passed 26 checks against isolated content. Earlier assertion corrections are described in `SHOWCASE_NOTES.md`. |
| Dependencies | `sharp` moved to `0.35.5` and locked `source-map-js` to `1.2.2` through an ordinary lockfile update. The newly reported Next.js advisory was cleared with the compatible `16.3.8` patch and matching ESLint config. `npm audit --omit=dev` reports zero advisories. The full audit has five high entries, all in the development-only Next ESLint → fast-glob → micromatch → braces chain. |

## Remaining items and limits

- The upstream `braces` advisory affects version `3.0.3` and had no patched
  release at review time. Do not claim a fully clean full-tree audit. The
  production tree is clean; revisit the development chain when an upstream fix
  is available. An audit suggestion to move `eslint-config-next` to an older
  major version would conflict with the current Next 16 stack.
- The installed Chrome executable covered desktop and mobile Chrome. Local
  Firefox and WebKit browser binaries were unavailable, so this change was not
  rechecked in those engines or on a physical device.
- Static preview behavior was checked locally. No hosted deployment, real
  provider permissions, or production launch was performed.
- Python conventions do not apply because this repository has no Python
  application code. The format gate enforces layout, while code review remains
  necessary for useful comments, clear names, and focused functions. This
  pass did not claim that every semantic engineering rule is mechanically
  provable from style checks.

Advisory references: [Sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w),
[source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), and
[braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
