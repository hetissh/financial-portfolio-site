// Builds a self-contained tab icon from the validated profile monogram.
export function monogramIconDataUrl(monogram: string): string {
  const count = Array.from(monogram).length;
  const fontSize = count >= 3 ? 19 : count === 2 ? 26 : 29;
  const textLength = count > 1 ? ' textLength="28" lengthAdjust="spacingAndGlyphs"' : '';
  const initials = monogram.replace(/[&<>"']/g, (character) => {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' } as const)[
      character as '&' | '<' | '>' | '"' | "'"
    ];
  });
  // Encoding the whole SVG also gives each saved monogram a distinct, cache-safe URL.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44"><rect width="44" height="44" rx="6" fill="#ddc986"/><text x="22" y="22" text-anchor="middle" dominant-baseline="central" font-family="Georgia,serif" font-size="${fontSize}" fill="#00007f"${textLength}>${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
