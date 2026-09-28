import { ProceduralCoverDrawing } from './ProceduralCoverDrawing';
import type { WordCover } from '@/lib/content-schema';
import { coverDesign, coverInk } from '@/lib/word-cover';

export function WordResearchArt({ cover, large = false, number = "01" }: { number?: string; cover: WordCover; large?: boolean }) {
  const { motif, rotation, spacing, count } = coverDesign(cover);
  const steps = Array.from({ length: count }, (_, index) => index);
  return <div className={`research-art art-word ${large ? 'art-large' : ''}`} style={{ backgroundColor: cover.color, color: coverInk(cover.color) }} aria-hidden="true" data-note-number={number} data-cover-word={cover.word} data-cover-color={cover.color} data-cover-variation={cover.variation} data-cover-seed={cover.seed}>
    <span className="art-corner">FIELD NOTES / {number}</span>
    <svg viewBox="0 0 400 230" fill="none" focusable="false">{cover.seed ? <ProceduralCoverDrawing word={cover.word} seed={cover.seed} /> : <g stroke="currentColor" strokeWidth="1.2" transform={`rotate(${rotation} 200 115)`}>
      {motif === 0 && steps.map(i => <g key={i} transform={`translate(0 ${(i - (count - 1) / 2) * spacing * .55})`}><path d="M95 115 200 160 305 115 200 70Z" /><path d="M95 115v10l105 45 105-45v-10" opacity=".3" /></g>)}
      {motif === 1 && <>{steps.map(i => <ellipse key={i} cx="200" cy="115" rx={34 + i * spacing} ry={80 - i * 5} transform={`rotate(${i * 24} 200 115)`} />)}<circle cx="200" cy="115" r="5" fill="currentColor" /><path d="M70 115h260M200 35v160" strokeDasharray="3 6" opacity=".5" /></>}
      {motif === 2 && <>{steps.map(i => { const height = 28 + ((i * 37 + spacing * 5) % 105); const x = 90 + i * 27; return <g key={i}><path d={`M${x} 180v-${height}l18-10v${height}Z`} /><path d={`M${x} ${180 - height}l-10-5 18-10 10 5M${x - 10} ${175 - height}V175l10 5`} opacity=".5" /></g>; })}<path d="M65 190h270" strokeDasharray="3 5" opacity=".5" /></>}
      {motif === 3 && <>{steps.map(i => <path key={i} d={`M${200 - 35 - i * spacing * .65} 160a${35 + i * spacing * .65} ${35 + i * spacing * .65} 0 0 1 ${70 + i * spacing * 1.3} 0`} />)}<path d="M200 35v157M80 160h240" strokeDasharray="3 6" opacity=".5" /><circle cx="200" cy="160" r="4" fill="currentColor" /></>}
      {motif === 4 && steps.map(i => <path key={i} d={`M75 ${55 + i * 14}C130 ${10 + i * spacing} 170 ${180 - i * 4} 215 ${110 + i * spacing / 2}S285 ${45 + i * spacing} 325 ${90 + i * 14}`} />)}
    </g>}</svg>
    <span className="art-bottom">{cover.word}</span><span className="art-plus">+</span>
  </div>;
}
