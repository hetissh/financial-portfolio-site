import type { WordCover } from './content-schema';

/** Stable across server rendering, the editor and static builds. */
export function coverSeed(word: string, variation = 0) {
  const normalized = `${word.normalize('NFKC').toLowerCase()}:${variation}`;
  let seed = 2166136261;
  for (const character of normalized) seed = Math.imul(seed ^ character.codePointAt(0)!, 16777619) >>> 0;
  return seed;
}
export function coverDesign(cover: WordCover) {
  const seed = coverSeed(cover.word, cover.variation);
  return { motif: seed % 5, rotation: (Math.floor(seed / 5) % 5 - 2) * 6, spacing: 12 + Math.floor(seed / 25) % 9, count: 5 + Math.floor(seed / 225) % 4 };
}
/** Choose black or white for at least 4.5:1 contrast on every valid colour. */
export function coverInk(colour: string) {
  const rgb = [1, 3, 5].map(offset => parseInt(colour.slice(offset, offset + 2), 16) / 255);
  const linear = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff';
}
