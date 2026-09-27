// Geometry v1: keep this algorithm stable so saved seeds retain their artwork.
// Future styles can use a new generator version alongside this one.
export const coverFamilies = ['layers', 'orbits', 'columns', 'arches', 'waves', 'lattice', 'spiral', 'fan', 'branches', 'contours'] as const;
export type CoverStroke = { d: string; opacity?: number; fill?: boolean; transform?: string };
export type ProceduralCover = { family: typeof coverFamilies[number]; motif: number; transform: string; strokes: CoverStroke[] };

function randomFor(word: string, seed: string) {
  let hash = 2166136261;
  for (const char of word.normalize('NFKC').toLowerCase()) hash = Math.imul(hash ^ char.codePointAt(0)!, 16777619) >>> 0;
  const hex = seed.replaceAll('-', '');
  let a = parseInt(hex.slice(0, 8), 16) ^ hash;
  let b = parseInt(hex.slice(8, 16), 16);
  let c = parseInt(hex.slice(16, 24), 16);
  let d = parseInt(hex.slice(24, 32), 16);
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const sum = ((a + b) | 0) + d | 0;
    d = d + 1 | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11) + sum | 0;
    return (sum >>> 0) / 4294967296;
  };
}
export const proceduralMotif = (word: string, seed: string) => Math.floor(randomFor(word, seed)() * coverFamilies.length);
const n = (value: number) => Math.round(value * 1000) / 1000;
const point = (x: number, y: number) => `${n(x)} ${n(y)}`;
const circle = (x: number, y: number, r: number) => `M${point(x - r, y)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0`;

export function proceduralDesign(word: string, seed: string): ProceduralCover {
  const random = randomFor(word, seed);
  const between = (min: number, max: number) => min + random() * (max - min);
  const integer = (min: number, max: number) => Math.floor(between(min, max + 1));
  const motif = integer(0, coverFamilies.length - 1);
  const strokes: CoverStroke[] = [];
  const path = (d: string, opacity = 1, fill = false, transform?: string) => strokes.push({ d, opacity, fill, transform });
  const count = integer(5, 9);
  const transform = `translate(${point(between(187, 213), between(106, 124))}) rotate(${n(between(-12, 12))}) scale(${n(between(.83, .98))})`;

  if (motif === 0) {
    const wide = between(73, 113), deep = between(22, 35), gap = between(7, 11);
    for (let i = 0; i < count; i++) {
      const y = (i - (count - 1) / 2) * gap;
      path(`M${point(-wide, y)} ${point(0, y + deep)} ${point(wide, y)} ${point(0, y - deep)}Z`);
      path(`M${point(-wide, y)}v${n(gap * .6)}l${point(wide, deep)} ${point(wide, -deep)}v${n(-gap * .6)}`, .3);
    }
  } else if (motif === 1) {
    for (let i = 0; i < count; i++) {
      const x = between(-9, 9), y = between(-8, 8), rx = between(38, 102), ry = between(28, 64);
      path(`M${point(x - rx, y)}a${point(rx, ry)} 0 1 0 ${point(rx * 2, 0)}a${point(rx, ry)} 0 1 0 ${point(-rx * 2, 0)}`, between(.5, 1), false, `rotate(${n(between(-70, 70))})`);
    }
    path(circle(0, 0, 3.5), 1, true);
  } else if (motif === 2) {
    const gap = 190 / count, width = between(10, Math.min(19, gap - 3)), bevel = between(5, 8);
    for (let i = 0; i < count; i++) {
      const x = -95 + i * gap, top = 62 - between(25, 120);
      path(`M${point(x, 62)}V${n(top)}l${point(width, -bevel)}V${n(62 - bevel)}Z`);
      path(`M${point(x, top)}l${point(-bevel, -bevel * .65)} ${point(width, -bevel)} ${point(bevel, bevel * .65)}M${point(x - bevel, top - bevel * .65)}V${n(62 - bevel * .65)}l${point(bevel, bevel * .65)}`, .5);
    }
    path('M-115 75H115', .35);
  } else if (motif === 3) {
    const offset = between(-18, 18), baseline = between(22, 40), largest = between(75, 105);
    for (let i = 0; i < count; i++) {
      const r = 18 + i * (largest - 18) / (count - 1);
      path(`M${point(offset - r, baseline)}a${point(r, r * between(.7, 1))} 0 0 1 ${point(r * 2, 0)}`);
    }
    path(circle(offset, baseline, 3), 1, true);
  } else if (motif === 4) {
    const spread = between(9, 14), bend = between(-35, 35);
    for (let i = 0; i < count; i++) {
      const y = (i - (count - 1) / 2) * spread;
      path(`M${point(-115, y)}C${point(-70, y - 40 + bend)} ${point(-5, y + 45)} ${point(32, y + between(-15, 15))}S${point(85, y - 40 - bend)} ${point(115, y + between(-10, 10))}`, between(.5, 1));
    }
  } else if (motif === 5) {
    const cols = integer(4, 7), rows = integer(3, 5), width = between(12, 17), depth = between(7, 11), gap = between(26, 30);
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      if (random() < .16) continue;
      const x = (col - (cols - 1) / 2) * gap + (row % 2 ? gap / 2 : 0), y = (row - (rows - 1) / 2) * depth * 2.3;
      path(`M${point(x - width, y)}l${point(width, -depth)} ${point(width, depth)} ${point(-width, depth)}Z`, between(.4, 1));
      if (random() < .2) path(circle(x, y, 1.7), .7, true);
    }
  } else if (motif === 6) {
    const turns = between(2.2, 4.6), size = between(55, 73), aspect = between(1.15, 1.45), start = between(0, Math.PI * 2);
    const points = Array.from({ length: 180 }, (_, i) => { const t = i / 179, a = start + t * turns * Math.PI * 2, r = 4 + size * t; return point(Math.cos(a) * r * aspect, Math.sin(a) * r); });
    path(`M${points.join('L')}`); path(circle(0, 0, 2.5), 1, true);
  } else if (motif === 7) {
    const rays = integer(12, 23), origin = between(-18, 18), sweep = between(110, 145);
    for (let i = 0; i < rays; i++) {
      const a = (-90 - sweep / 2 + sweep * i / (rays - 1)) * Math.PI / 180, r = between(95, 132);
      path(`M${point(origin, 60)}L${point(origin + Math.cos(a) * r, 60 + Math.sin(a) * r)}`, between(.5, 1));
    }
    path(circle(origin, 60, 3), 1, true);
  } else if (motif === 8) {
    const branches = integer(5, 9), trunk = between(-15, 15);
    path(`M${point(trunk, 65)}V10`);
    for (let i = 0; i < branches; i++) {
      const x = -100 + 200 * i / (branches - 1), y = between(-65, -27), fork = between(-8, 20);
      path(`M${point(trunk, 40)}Q${point(trunk, fork)} ${point(x * .5, fork - 12)}L${point(x, y)}`);
      path(circle(x, y, between(2.5, 5)), .9, random() < .45);
    }
  } else {
    const phase = between(0, Math.PI * 2), ripple = between(.035, .14), aspect = between(1.25, 1.55), frequency = integer(3, 6);
    for (let ring = 0; ring < count; ring++) {
      const radius = 13 + ring * 49 / (count - 1);
      const points = Array.from({ length: 65 }, (_, i) => { const a = i / 64 * Math.PI * 2, r = radius * (1 + Math.sin(a * frequency + phase) * ripple + Math.cos(a * 2 - phase) * .05); return point(Math.cos(a) * r * aspect, Math.sin(a) * r); });
      path(`M${points.join('L')}Z`, between(.55, 1));
    }
  }
  // Small surveying marks vary independently from the main drawing.
  if (random() < .65) path(`M${point(-115, between(-30, 35))}h${n(between(8, 18))}M${point(between(-25, 25), -78)}v${n(between(7, 13))}`, .35);
  return { motif, family: coverFamilies[motif], transform, strokes };
}
