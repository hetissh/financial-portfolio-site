# Acceptance checklist

Status, 26 September 2026: the local implementation passes 13 unit tests and 51 applicable browser checks. See [recorded evidence](../docs/qa-evidence/RESULTS.md). Real-device, manual screen-reader, and deployed-host checks remain pending; the unchecked items below retain the complete release checklist.

Record date, commit, route, viewport, browser/OS/device, outcome, and screenshot/trace or reproduction notes in `docs/qa-evidence/`. Resolve the intended product and design in P0 before using this as a release checklist.

## Release-blocking behavior

| ID | Check | Expected result | Evidence |
| --- | --- | --- | --- |
| S1 | Scroll home from top to footer at narrow widths | All sections reachable; no fixed outer container clips content | Automated geometry plus real touch test |
| S2 | Swipe vertically starting inside a research card, then horizontally across cards | Vertical gesture scrolls the page; horizontal gesture scrolls the rail | Real iPhone and Android |
| S3 | Reach footer; activate Back to top; repeat three times, including while URL already has `#top` | Document settles within 2px of top on every cycle | Playwright plus real phones |
| S4 | Activate Back to top using keyboard | Scroll returns to top and focus moves to the intended heading/landmark | Browser test plus keyboard inspection |
| S5 | Enable reduced motion and repeat S3 | Immediate movement without smooth-scrolling animation | Browser test and manual check |
| S6 | Activate at top and after resizing/rotating | No exception, focus loss, or wrong scroll target | Browser test plus real phone rotation |
| R1 | Move through rail with arrows, touch, mouse/trackpad, and keyboard | Every item reachable; no page-wide horizontal scrolling | Automated and manual |
| R2 | First/last card and zero/one-item fixtures | Correct disabled/hidden controls; no invalid indices | Browser fixtures |
| R3 | Tab through cards partly outside the visible rail | Focus indicator and focused card remain visible | Keyboard inspection |
| N1 | Open each research URL directly and refresh | Correct content; no host fallback or unexpected 404 | Local export and deployed preview |
| N2 | Open invalid research slug | Useful 404 with working home/research links | Local and deployed preview |
| N3 | Use section anchors, browser Back/Forward, and return from research | Predictable history/scroll behavior; no trapped scroll state | Browser tests |
| N4 | Disable JavaScript | Core text, research links, downloads, anchors and top link remain usable | Browser test |
| C1 | Validate publication data and assets | No draft leakage, duplicate slugs, invalid dates, missing assets, or placeholder claims | Content tests plus build-output inspection |
| C2 | Open contact/source/download links | Correct approved destination, readable label, valid file | Link checks plus manual sampling |

## Layout, accessibility, and quality

- [ ] Inspect 320, 390, 768, 1024, and 1440 CSS-pixel widths; include short landscape viewports.
- [ ] Desktop uses the agreed two-column composition; mobile stacks in a logical reading order.
- [ ] No document-wide horizontal overflow or overlapping text with long titles and enlarged text.
- [ ] Check 200% zoom and a 320px-equivalent reflow view; all content/actions remain accessible.
- [ ] Header, main, headings, lists, footer and skip link have meaningful semantics.
- [ ] All controls can be used without a pointer; focus is visible and not hidden by sticky elements.
- [ ] Screen reader announces link/button purposes and research structure sensibly.
- [ ] Text contrast, non-color cues, image alternatives, and control sizes pass manual review and automated accessibility checks.
- [ ] Chart content, if present, includes units, dates, sources and a text/table alternative.
- [ ] There are no hydration errors, uncaught exceptions, broken asset requests, or missing routes.
- [ ] Media has reserved dimensions; below-fold assets do not unnecessarily block initial rendering.
- [ ] Capture a representative throttled mobile performance trace and record LCP/CLS and known limits.
- [ ] Page title, description, canonical, social preview, favicon, sitemap, and robots behavior are correct for the environment.

## Browser and device matrix

| Environment | Scope |
| --- | --- |
| Playwright Chromium, Firefox, WebKit | Core navigation, rendering and scroll-position regression suite |
| Playwright mobile Chromium/WebKit profiles | Viewport/touch configuration, repeated Back to top, rail boundaries |
| Real iPhone Safari | Finger scrolling over cards, Back to top, browser chrome resizing, portrait/landscape, screen reader sampling |
| Real Android Chrome | Same primary touch journeys and text scaling |
| Actual embedding/mobile app, if required by P0 | Original reported failures reproduced and verified fixed in that host |

Emulation complements real devices; it does not establish that iOS Safari or an embedded app passes. Browser-engine details: [Playwright documentation](https://playwright.dev/docs/browsers).

## Production smoke and handover

- [ ] Production uses the reviewed commit/artifact and approved content.
- [ ] Domain/HTTPS, home, a direct research URL, 404, asset paths, downloads, and metadata work on the deployed host.
- [ ] Repeat phone scrolling and Back to top checks on the production URL.
- [ ] Preview access/indexing settings and production indexing settings are intentional.
- [ ] Last known-good release can be redeployed; rollback instructions have been checked.
- [ ] Content-editing, build, preview, release, and rollback instructions are documented.
- [ ] Any missing device evidence is reported explicitly; the corresponding check stays open.

Release decision: no critical navigation, scrolling, inaccessible-control, publication, or broken-route defects remain. Do not replace missing evidence with the statement that a handler ran or a mobile viewport looked correct.
