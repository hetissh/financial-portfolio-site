# Artwork picker and crop verification — 27 September 2026

Implemented 13 fixed theme designs (including the three original illustrations), 87 bundled Hero Patterns with attribution, immediate word/colour customisation, and JPEG/PNG/WebP import with drag/zoom/position cropping. Existing seeded covers remain supported. The selected artwork preview appears alongside its controls.

Verification completed in a disposable project copy using Node 24.19 and Playwright 1.63:

- 50 unit checks passed: valid catalogue defaults, stable fixed geometry when labels change, crop bounds, actual selected image pixels, metadata/orientation normalisation, format/size validation, missing assets, containment, and existing content/admin/sheet behaviour.
- All 18 distinct admin browser checks passed in Chromium, Firefox and mobile WebKit. Six artwork cases were rerun successfully after the final preview/focus/drag changes. Checks include saved covers after reload, reset, pattern selection, image re-cropping, cancellation, drag and keyboard controls, network-failure recovery and cross-origin blocking.
- All 71 applicable public browser checks passed across desktop Chromium/Firefox/WebKit and mobile Chromium/WebKit, including static export image/pattern/theme fixtures. Four existing CDP touch checks intentionally skip on unsupported browser profiles. Five existing SVG-only artwork assertions were updated to support images/patterns and rerun successfully.
- The static fixture build exported exactly the visible cropped image. Its private original, the draft image, and admin API requests returned 404. Image covers also rendered with JavaScript disabled. Source content in the staging copy was restored afterward; the user's content was not used for mutable tests.
- Production compilation/type checks and lint passed. The local project preview is rebuilt after installation.
- Visual inspection of desktop/mobile pickers and the crop modal completed. Automated axe checks reported no WCAG A/AA violations in the tested admin and public routes.

Testing fixed a revoked blob URL during React development remounts and Firefox restoring a stale colour field after reload. The crop modal now owns a URL per effect setup and closes on cleanup; editor autocomplete is disabled to preserve saved field values.

No screenshot baseline exists, so visual regression status is inconclusive. Physical-device touch testing and screen-reader verification remain manual. Uploaded source images and unused crops stay private for recovery and should be included in content backups. Hero Patterns uses CC BY 4.0; see `web/THIRD_PARTY_NOTICES.md`.
