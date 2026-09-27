import type { WordCover, Research } from '@/lib/content-schema';
import presets from '@/lib/artwork-presets.json';
import { heroBackground, legacyHeroOpacity } from '@/lib/artwork';
import { coverInk } from '@/lib/word-cover';
import { ThemeDrawing } from './ThemeDrawing';
import { ProceduralCoverDrawing } from './ProceduralCoverDrawing';
export function SelectedResearchArt({ cover, large = false }: { cover: WordCover; large?: boolean }) {
  const color = /^#[0-9a-fA-F]{6}$/.test(cover.color) ? cover.color : '#dbe3d5';
  const ink = coverInk(color);
  const foreground = cover.foregroundColor && /^#[0-9a-fA-F]{6}$/.test(cover.foregroundColor) ? cover.foregroundColor : ink;
  const opacity = cover.foregroundOpacity ?? legacyHeroOpacity;
  const preset = presets.find(p => p.id === cover.preset);
  return <div className={`research-art art-word art-selected art-${cover.type} ${large ? 'art-large' : ''}`} style={{ backgroundColor: color, color: ink }} aria-hidden="true" data-cover-word={cover.word} data-cover-color={color} data-cover-variation={cover.variation} data-cover-type={cover.type} data-cover-preset={cover.preset} data-cover-pattern={cover.hero} data-cover-image={cover.imageId}>
    {cover.type === 'hero' && <div className="hero-pattern-layer" data-pattern-foreground={foreground} data-pattern-opacity={opacity} style={{ backgroundImage: heroBackground(cover.hero!, foreground), opacity }} />}
    {/* Crops are already resized and encoded by the import pipeline. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {cover.type === 'image' && <img className="cover-image" src={process.env.NEXT_PUBLIC_PORTFOLIO_ADMIN === '1' ? `/admin/api/images/${cover.imageId}/` : `/images/covers/${cover.imageId}.webp`} alt="" />}
    {cover.type === 'theme' && (preset ? <svg viewBox="0 0 400 230" fill="none"><ProceduralCoverDrawing word={preset.word} seed={preset.seed} /></svg> : <ThemeDrawing theme={cover.preset as Research['theme']} />)}
    <span className="art-corner">FIELD NOTES / {cover.type === 'hero' ? 'PATTERNS' : cover.type === 'image' ? 'IMAGE' : 'ARTWORK'}</span>
    <span className="art-bottom">{cover.word}</span><span className="art-plus">+</span>
  </div>;
}
