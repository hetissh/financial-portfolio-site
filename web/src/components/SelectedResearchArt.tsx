// Chooses the artwork shown for selected research on the home page.
/* eslint-disable @next/next/no-img-element -- Imported covers are already resized and encoded. */
import type { WordCover, Research } from '@/lib/content-schema';
import presets from '@/lib/artwork-presets.json';
import { heroBackground, legacyHeroOpacity } from '@/lib/artwork';
import { coverInk } from '@/lib/word-cover';
import { ThemeDrawing } from './ThemeDrawing';
import { ProceduralCoverDrawing } from './ProceduralCoverDrawing';
import { visitorAssetUrl } from '@/lib/supabase/assets';
import { runtimeSetting } from '@/lib/runtime-env';
export function SelectedResearchArt({
  cover,
  large = false,
  number = '01',
  privatePreview = false,
}: {
  number?: string;
  cover: WordCover;
  large?: boolean;
  privatePreview?: boolean;
}) {
  const color = /^#[0-9a-fA-F]{6}$/.test(cover.color) ? cover.color : '#dbe3d5';
  const ink = coverInk(color);
  const foreground =
    cover.foregroundColor && /^#[0-9a-fA-F]{6}$/.test(cover.foregroundColor)
      ? cover.foregroundColor
      : ink;
  const opacity = cover.foregroundOpacity ?? legacyHeroOpacity;
  const preset = presets.find((p) => p.id === cover.preset);
  return (
    <div
      className={`research-art art-word art-selected art-${cover.type} ${large ? 'art-large' : ''}`}
      style={{ backgroundColor: color, color: ink }}
      aria-hidden="true"
      data-note-number={number}
      data-cover-word={cover.word}
      data-cover-color={color}
      data-cover-variation={cover.variation}
      data-cover-type={cover.type}
      data-cover-preset={cover.preset}
      data-cover-pattern={cover.hero}
      data-cover-image={cover.imageId}
    >
      {cover.type === 'hero' && (
        <div
          className="hero-pattern-layer"
          data-pattern-foreground={foreground}
          data-pattern-opacity={opacity}
          style={{ backgroundImage: heroBackground(cover.hero!, foreground), opacity }}
        />
      )}
      {cover.type === 'image' && (
        <img
          className="cover-image"
          src={
            cover.unsplash
              ? cover.unsplash.imageUrl
              : runtimeSetting('PORTFOLIO_DATA_SOURCE') === 'supabase' && !privatePreview
                ? visitorAssetUrl(`/images/covers/${cover.imageId}.webp`)
                : runtimeSetting('PORTFOLIO_ADMIN') === '1'
                  ? privatePreview
                    ? `/admin/api/images/${cover.imageId}/`
                    : `/media/images/${cover.imageId}/`
                  : `/images/covers/${cover.imageId!}.webp`
          }
          alt=""
        />
      )}
      {cover.type === 'theme' &&
        (preset ? (
          <svg viewBox="0 0 400 230" fill="none">
            <ProceduralCoverDrawing word={preset.word} seed={preset.seed} />
          </svg>
        ) : (
          <ThemeDrawing theme={cover.preset as Research['theme']} />
        ))}
      <span className="art-corner">FIELD NOTES / {number}</span>
      <span className="art-bottom">{cover.word}</span>
      <span className="art-plus">+</span>
    </div>
  );
}
