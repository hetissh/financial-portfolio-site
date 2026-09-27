# Continuous cover generation — 27 September 2026

Both Generate cover and Try another variation now create fresh artwork for unchanged word/colour inputs. A new UUID seed controls ten geometric families, proportions, positions, angles, spacing, details and line treatments. The editor retries a seed when it would immediately repeat the previous family (up to 16 attempts). This makes exact repeats unlikely; visually related designs can still occur.

The selected seed and `generatorVersion: 1` are saved with the research record. Rendering uses deterministic geometry, so reloading and static builds preserve the chosen artwork. Original covers without seeds retain the previous generator. Geometry v1 is kept separate so future algorithms can introduce another version without silently changing saved artwork. No image API, key or new dependency is used.

## Validation

- ESLint, type checking and optimized static build passed.
- 44 unit tests passed, including 10,000 seeded designs with no exact duplicates in that test batch, all ten families represented, stable geometry for saved seeds, version/input validation and legacy compatibility.
- 12 admin browser checks passed across Chromium, Firefox and mobile WebKit. Repeated clicks with identical inputs produce new seeds/artwork, avoid consecutive family repeats, and save/reload the selected SVG unchanged. Reset, previews, theme fallback and existing admin workflows also passed.
- 66 public browser checks passed; four intentional CDP touch-test skips. A seeded cover in an isolated content fixture verified home/index/article rendering and no-JavaScript static export.
- All ten families received a visual inspection; no overflow at 320 px. Actual-phone and screen-reader checks remain pending; axe checks are not full accessibility certification. There is no approved visual baseline, so visual regression comparison is INCONCLUSIVE.

## Evidence

- [All ten cover families](procedural-covers/ten-families.png), captured from the live editor and assembled into a gallery.
- [320 px cover](procedural-covers/cover-small-mobile.png), [viewport observations](procedural-covers/viewports.json).

Test datasets and generated galleries were isolated. Existing research content was preserved during installation. Saved changes update the local admin immediately; rebuilding updates the static preview.
