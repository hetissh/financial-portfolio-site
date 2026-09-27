import presets from './artwork-presets.json';
import patterns from './hero-patterns.json';
export const themeArtwork = [
  { id: 'forest', label: 'Foundations', word: 'Foundations', color: '#dbe3d5' },
  { id: 'clay', label: 'Perspective', word: 'Perspective', color: '#eee0ce' },
  { id: 'blue', label: 'Context', word: 'Context', color: '#dce3e6' },
  ...presets,
];
export const heroPatterns = patterns;
export const heroAppearanceDefaults = { foregroundColor: '#000000', foregroundOpacity: .4 };
// Existing covers without appearance settings retain their original auto ink and opacity.
export const legacyHeroOpacity = .18;
export function heroBackground(id: string, ink: string) {
  const pattern = patterns.find(p => p.id === id);
  return pattern ? `url("data:image/svg+xml,${encodeURIComponent(pattern.svg.replaceAll('#000', ink))}")` : undefined;
}
export const imageDefault = { word: 'Image', color: '#f2eee3' };
