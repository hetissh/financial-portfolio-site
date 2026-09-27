# Word and colour covers — 27 September 2026

Research editors can generate geometric card artwork from one word and a colour. No API key, network image service, new dependency, or uploaded image is required.

Use **Cover** in the editor shortcuts, then **Create a cover**: enter a word, pick a colour or enter a six-digit hex colour, generate, optionally try another variation, and save the note. The same saved cover appears on home/index cards and the article. **Use theme artwork** restores the original illustration; Reset edits restores the last saved cover.

An optional `cover` object in the research JSON stores `word`, `color`, and `variation`. Existing content remains valid. SVG geometry derives deterministically from the normalized word and variation; it is abstract artwork, not a literal interpretation of the subject. Black/white text and lines adapt to the chosen background. Static HTML contains the SVG and requires no JavaScript or API request to display it.

## Verification

- ESLint and TypeScript passed; optimized static export passed.
- 41 unit tests passed, including five cover tests for input validation, form round-tripping, deterministic generation, exported SVG markup and contrast across a 4,096-colour palette.
- The nine existing admin journeys passed across Chromium, Firefox and mobile WebKit. The three new cover journeys passed after correcting test selectors/navigation waits. They cover validation, colour, variations, save/reload, reset, draft preview, public/index rendering, theme fallback, narrow viewports and axe checks.
- 66 public browser checks passed, with four intentional CDP touch-test skips, across Chromium, Firefox, WebKit and mobile profiles. A temporary cover on the isolated sample note verified custom artwork in the real export, including no-JavaScript rendering; this test fixture was not applied to the user's research content.
- Generated artwork and mobile controls received a visual inspection. No page overflow at 320 px. Actual-phone/screen-reader checks remain pending; automated accessibility checks do not establish full conformance. No approved visual baseline exists, so visual regression comparison remains INCONCLUSIVE.

## Evidence

- [Generated cover examples](word-covers/cover-examples.png).
- [Desktop controls](word-covers/controls-desktop.png), [320 px controls](word-covers/controls-small-mobile.png), [320 px cover](word-covers/cover-small-mobile.png).
- [Viewport observation](word-covers/viewport.json).

The gallery combines actual generated SVGs captured from the editor for display. Existing notes keep their saved artwork until a new cover is generated and saved. As with other admin edits, the static preview needs a rebuild after saving.
