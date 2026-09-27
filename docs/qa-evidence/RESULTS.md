# Implementation QA

Date: 26 September 2026. Target: the built static preview, served locally on port 4173.

## Verified

| Check | Result |
| --- | --- |
| ESLint | Pass |
| TypeScript | Pass, including production build type checking |
| Content validation | Pass, three visible sample notes |
| Vitest | 13 passed |
| Playwright | 51 passed; 4 intentionally skipped |
| Static export | Home, research index, three detail routes, and 404 generated |
| Automated accessibility | No axe violations on home, index, or detail in the tested browser configurations |
| Mobile layout | No document-wide overflow at 320, 390, 768, 1024, or 1440px; mobile card width explicitly checked |
| Font loading | Local fonts, preloaded with size-matched fallbacks; zero CLS in the recorded final render runs |

Browsers: Chromium 152, Firefox 155, WebKit 26.6; desktop profiles plus Pixel 7 and iPhone 13 emulation. The four skips are the CDP touch-dispatch case on configurations other than mobile Chromium. The mobile Chromium touch test passed both vertical document scrolling initiated over the rail and horizontal rail scrolling.

The behavioral suite checks three repeated Back to top activations with an existing `#top` hash, keyboard focus, reduced motion, normal smooth motion, viewport changes, arrow boundaries, off-screen card focus, section links, browser history, direct research loads/refresh, genuine 404 status, core reading without JavaScript, and console/asset errors on the smoke journey.

Content tests cover draft/sample publication boundaries, invalid dates, duplicate slugs/IDs, unsafe URLs, missing downloads, release readiness, ordering, empty collections, and zero/one-item rail controls. Package manifest dependency declarations match the lockfile.

## Visual review

Reviewed desktop and mobile home and article captures. No text collisions or document-wide overflow were observed after the fixes. The index is also captured. The original site/screenshot baseline was unavailable, so comparison with the original is **inconclusive**; these captures establish the first implementation baseline.

- [Desktop home](home-desktop.png)
- [Mobile home](home-mobile.png)
- [320px home](home-small-mobile.png)
- [Desktop research](research-desktop.png)
- [Mobile research](research-mobile.png)
- [Desktop article](article-desktop.png)
- [Mobile article](article-mobile.png)

## Performance observations

See [throttled measurements](throttled-mobile-metrics.json) and [unthrottled render observations](local-render-metrics.json).

One cold-cache Chromium mobile run per route used 4× CPU slowdown, 150ms latency, and 1.6 Mbps downstream against the local server:

| Route | LCP | CLS |
| --- | --- | --- |
| Home | 956ms | 0 |
| Research article | 888ms | 0 |

These are local lab observations, not hosted-site performance guarantees or real-user percentiles. INP was not measured. Actual hosting/network conditions require a separate release check.

## Remaining manual/release checks

- Real iPhone Safari and Android Chrome finger scrolling, browser chrome resizing, and rotation.
- The actual embedding app, if reproducing that environment is still required.
- Manual screen-reader use and zoom/text-scaling review beyond automated geometry checks.
- Approved owner profile, contact links, résumé if desired, and actual research.
- Public host/domain configuration, hosted smoke checks, and production rollback exercise.
- GitHub Actions workflow execution: configured but not run on a remote repository.

Verdict: **local implementation ready for review**. Public release and real-device verification remain open; the original mobile-app issues are not claimed to be verified on a physical device.
