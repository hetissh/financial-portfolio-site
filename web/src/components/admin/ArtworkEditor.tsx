// Edits theme, generated, and imported cover artwork for a draft note.
/* eslint-disable @next/next/no-img-element -- Unsplash requires using its returned hotlink URLs directly. */
'use client';
import { noteNumber } from '@/lib/research-order';
import { useState } from 'react';
import {
  themeArtwork,
  heroPatterns,
  heroAppearanceDefaults,
  legacyHeroOpacity,
  imageDefault,
} from '@/lib/artwork';
import { coverInk } from '@/lib/word-cover';
import type { ResearchDraft } from '@/lib/admin/form';
import type { WordCover } from '@/lib/content-schema';
import type { ImageCrop } from '@/lib/image-crop';
import { coverUploadSchema, responseMessage } from '@/lib/admin/client-response';
import { ResearchArt } from '@/components/ResearchArt';
import { Field } from './fields';
import { ImageCropDialog } from './ImageCropDialog';
import styles from './admin.module.css';
type UnsplashPhoto = {
  id: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  photoUrl: string;
  downloadLocation: string;
  photographer: string;
  photographerUrl: string;
};

export function ArtworkEditor({
  draft,
  setDraft,
  issues,
  onBusy,
  generate,
  error,
  onEdited,
  number,
}: {
  number: number;
  draft: ResearchDraft;
  setDraft: React.Dispatch<React.SetStateAction<ResearchDraft>>;
  issues: Map<string, string[]>;
  onBusy: (busy: boolean) => void;
  generate: () => void;
  error?: string;
  onEdited: () => void;
}) {
  const [picker, setPicker] = useState<'theme' | 'hero' | 'image' | 'unsplash'>(
    draft.cover?.type === 'hero' ? 'hero' : draft.cover?.type === 'image' ? 'image' : 'theme',
  );
  const [query, setQuery] = useState('');
  const [imageError, setImageError] = useState<string>();
  const [cropFile, setCropFile] = useState<File>();
  const [initialCrop, setInitialCrop] = useState<ImageCrop>();
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [photoQuery, setPhotoQuery] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string>();
  const selected = draft.cover;
  const isHero = selected?.type === 'hero';
  // Older saved covers may not have explicit ink or opacity settings.
  const backgroundColor = /^#[0-9a-fA-F]{6}$/.test(draft.coverColor) ? draft.coverColor : '#dce3e6';
  const foregroundColor = selected?.foregroundColor ?? coverInk(backgroundColor);
  const foregroundOpacity = selected?.foregroundOpacity ?? legacyHeroOpacity;
  function setAppearance(patch: Partial<WordCover>) {
    onEdited();
    setDraft((current) =>
      current.cover?.type === 'hero'
        ? { ...current, cover: { ...current.cover, ...patch } }
        : current,
    );
  }
  function choose(cover: WordCover) {
    onEdited();
    setDraft((c) => ({ ...c, cover, coverWord: cover.word, coverColor: cover.color }));
  }
  function customize(field: 'word' | 'color', value: string) {
    onEdited();
    setDraft((c) => ({
      ...c,
      [field === 'word' ? 'coverWord' : 'coverColor']: value,
      cover: {
        ...(c.cover ?? {
          type: 'theme',
          preset: c.theme,
          variation: 0,
          word: c.coverWord,
          color: c.coverColor,
        }),
        [field]: value,
      },
    }));
  }
  const filtered = heroPatterns.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()));
  function importFile(file?: File) {
    if (!file) return;
    setImageError(undefined);
    if (!/\.(jpe?g|png|webp)$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
      setImageError('Choose a JPEG, PNG or WebP image up to 10 MB.');
      return;
    }
    setInitialCrop(undefined);
    setCropFile(file);
  }
  async function searchPhotos() {
    setPhotoError(undefined);
    setPhotoBusy(true);
    try {
      const response = await fetch(
        `/admin/api/unsplash/?query=${encodeURIComponent(photoQuery.trim())}`,
      );
      const payload = (await response.json()) as {
        results?: UnsplashPhoto[];
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message ?? 'Could not search Unsplash.');
      setPhotos(payload.results ?? []);
    } catch (cause) {
      setPhotoError(cause instanceof Error ? cause.message : 'Could not search Unsplash.');
    } finally {
      setPhotoBusy(false);
    }
  }
  async function recrop() {
    setImageError(undefined);
    onBusy(true);
    try {
      const response = await fetch(`/admin/api/images/${selected?.imageId}/?original=1`);
      if (!response.ok) throw new Error('Original image is missing. Import it again.');
      setInitialCrop(selected?.crop);
      setCropFile(new File([await response.blob()], 'cover.webp', { type: 'image/webp' }));
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Could not open image.');
    } finally {
      onBusy(false);
    }
  }
  async function applyCrop(crop: ImageCrop) {
    onBusy(true);
    try {
      const body = new FormData();
      body.set('file', cropFile!);
      body.set('crop', JSON.stringify(crop));
      const response = await fetch('/admin/api/images/', {
        method: 'POST',
        headers: { 'X-Portfolio-Admin': '1' },
        body,
      });
      const responseBody: unknown = await response.json();
      if (!response.ok) throw new Error(responseMessage(responseBody, 'Could not import image.'));
      const result = coverUploadSchema.safeParse(responseBody);
      if (!result.success)
        throw new Error('The admin returned an invalid image response. Try again.');
      choose({
        type: 'image',
        imageId: result.data.id,
        crop: result.data.crop,
        variation: 0,
        word: selected?.type === 'image' ? draft.coverWord : imageDefault.word,
        color: selected?.type === 'image' ? draft.coverColor : imageDefault.color,
      });
      setCropFile(undefined);
    } finally {
      onBusy(false);
    }
  }
  return (
    <fieldset className={styles.fieldset} id="editor-cover">
      <legend className={styles.legend}>Cover artwork</legend>
      <p className={styles.intro}>
        Choose a design, then make its word and colour your own. Your selection appears immediately
        in the card preview.
      </p>
      <div className={styles.artworkTabs} aria-label="Artwork sources">
        {(['theme', 'hero', 'image', 'unsplash'] as const).map((p) => (
          <button type="button" key={p} aria-pressed={picker === p} onClick={() => setPicker(p)}>
            {p === 'theme'
              ? 'Theme artwork'
              : p === 'hero'
                ? 'Hero Patterns'
                : p === 'image'
                  ? 'Import image'
                  : 'Unsplash'}
          </button>
        ))}
      </div>
      <div className={styles.artworkCustomize} id="artwork-customize">
        <div className={styles.artworkPreview}>
          <span className={styles.label}>Selected artwork</span>
          <ResearchArt
            theme={draft.theme}
            cover={selected}
            privatePreview
            number={noteNumber(
              { noteNumber: draft.noteNumber.trim() ? Number(draft.noteNumber) : undefined },
              number,
            )}
          />
        </div>
        <div>
          <Field
            field="noteNumber"
            label="Note number"
            optional
            hint="Leave blank to number this note automatically from its position in the notebook."
            issues={issues}
          >
            {(props) => (
              <input
                {...props}
                className={styles.input}
                type="number"
                min={1}
                max={9999}
                step={1}
                inputMode="numeric"
                placeholder={`Automatic (${String(number).padStart(2, '0')})`}
                value={draft.noteNumber}
                onChange={(e) => {
                  onEdited();
                  setDraft((current) => ({ ...current, noteNumber: e.target.value }));
                }}
              />
            )}
          </Field>
          <Field
            field="cover.word"
            label="Cover word"
            hint="One word, up to 32 characters."
            issues={issues}
          >
            {(props) => (
              <input
                {...props}
                className={styles.input}
                maxLength={32}
                value={draft.coverWord}
                onChange={(e) => customize('word', e.target.value)}
              />
            )}
          </Field>
          {picker !== 'hero' && (
            <Field field="cover.color" label="Cover colour" issues={issues}>
              {(props) => (
                <div className={styles.coverColour}>
                  <input
                    aria-label="Pick cover colour"
                    type="color"
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(draft.coverColor) ? draft.coverColor : '#dbe3d5'
                    }
                    onChange={(e) => customize('color', e.target.value)}
                  />
                  <input
                    {...props}
                    className={styles.input}
                    autoComplete="off"
                    value={draft.coverColor}
                    maxLength={7}
                    spellCheck={false}
                    onChange={(e) => customize('color', e.target.value)}
                  />
                </div>
              )}
            </Field>
          )}
        </div>
      </div>
      {picker === 'hero' && (
        <fieldset className={styles.patternControls} disabled={!isHero}>
          <legend className={styles.srOnly}>Pattern appearance</legend>
          <Field field="cover.foregroundColor" label="Foreground colour" issues={issues}>
            {(props) => (
              <div className={styles.coverColour}>
                <input
                  type="color"
                  aria-label="Pick foreground colour"
                  value={/^#[0-9a-fA-F]{6}$/.test(foregroundColor) ? foregroundColor : '#000000'}
                  onChange={(e) => setAppearance({ foregroundColor: e.target.value })}
                />
                <input
                  {...props}
                  className={styles.input}
                  autoComplete="off"
                  value={foregroundColor}
                  maxLength={7}
                  spellCheck={false}
                  onChange={(e) => setAppearance({ foregroundColor: e.target.value })}
                />
              </div>
            )}
          </Field>
          <Field field="cover.color" label="Background colour" issues={issues}>
            {(props) => (
              <div className={styles.coverColour}>
                <input
                  type="color"
                  aria-label="Pick background colour"
                  value={backgroundColor}
                  onChange={(e) => customize('color', e.target.value)}
                />
                <input
                  {...props}
                  className={styles.input}
                  autoComplete="off"
                  value={draft.coverColor}
                  maxLength={7}
                  spellCheck={false}
                  onChange={(e) => customize('color', e.target.value)}
                />
              </div>
            )}
          </Field>
          <Field field="cover.foregroundOpacity" label="Foreground opacity" issues={issues}>
            {(props) => (
              <div className={styles.patternOpacity}>
                <input
                  {...props}
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={foregroundOpacity}
                  aria-valuetext={`${Math.round(foregroundOpacity * 100)} percent`}
                  onChange={(e) => setAppearance({ foregroundOpacity: Number(e.target.value) })}
                />
                <span>{Math.round(foregroundOpacity * 100)}%</span>
              </div>
            )}
          </Field>
        </fieldset>
      )}
      {picker === 'hero' && !isHero && (
        <p className={styles.hint}>Choose a pattern below to edit its appearance.</p>
      )}
      {picker === 'theme' && (
        <div className={styles.artworkGrid} aria-label="Theme artwork choices">
          {themeArtwork.map((p) => {
            const cover: WordCover = {
              type: 'theme',
              preset: p.id,
              word: p.word,
              color: p.color,
              variation: 0,
            };
            return (
              <button
                type="button"
                className={styles.artworkChoice}
                key={p.id}
                aria-label={`Choose ${p.label} artwork`}
                aria-pressed={
                  selected?.type === 'theme'
                    ? selected.preset === p.id
                    : !selected && draft.theme === p.id
                }
                onClick={() => choose(cover)}
              >
                <ResearchArt
                  theme="forest"
                  cover={cover}
                  number={noteNumber(
                    { noteNumber: draft.noteNumber.trim() ? Number(draft.noteNumber) : undefined },
                    number,
                  )}
                />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      )}
      {picker === 'hero' && (
        <>
          <label className={styles.group}>
            <span className={styles.label}>Find a pattern</span>
            <input
              className={styles.input}
              type="search"
              value={query}
              placeholder="Try circles, waves or hexagons"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <p className={styles.hint}>
            {filtered.length} of {heroPatterns.length} patterns
          </p>
          <div className={styles.artworkGrid} aria-label="Hero Pattern choices">
            {filtered.map((p) => {
              const cover: WordCover = {
                type: 'hero',
                hero: p.id,
                word: p.word,
                color: p.color,
                variation: 0,
                ...heroAppearanceDefaults,
              };
              return (
                <button
                  type="button"
                  className={styles.artworkChoice}
                  key={p.id}
                  aria-label={`Choose ${p.label} pattern`}
                  aria-pressed={selected?.type === 'hero' && selected.hero === p.id}
                  onClick={() => {
                    choose(cover);
                    document
                      .getElementById('artwork-customize')
                      ?.scrollIntoView({ block: 'start' });
                  }}
                >
                  <ResearchArt
                    theme="forest"
                    cover={cover}
                    number={noteNumber(
                      {
                        noteNumber: draft.noteNumber.trim() ? Number(draft.noteNumber) : undefined,
                      },
                      number,
                    )}
                  />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
          {!filtered.length && (
            <p className={styles.hint}>No matching patterns. Try another name.</p>
          )}
          <p className={styles.hint}>
            Patterns by{' '}
            <a href="https://heropatterns.com/" target="_blank" rel="noreferrer">
              Steve Schoger / Hero Patterns
            </a>
            ,{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            . Colours adapted to your selection.
          </p>
        </>
      )}
      {picker === 'image' && (
        <div className={styles.imageImport}>
          <label className={styles.group}>
            <span className={styles.label}>Choose an image</span>
            <input
              className={styles.input}
              aria-label="Import cover image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                importFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <p className={styles.hint}>
            JPEG, PNG or WebP · up to 10 MB. Choose a crop before applying.
          </p>
          {selected?.type === 'image' && selected.imageId && (
            <button type="button" className={styles.addButton} onClick={() => void recrop()}>
              Adjust image crop
            </button>
          )}
          {imageError && (
            <p className={styles.error} role="alert">
              {imageError}
            </p>
          )}
        </div>
      )}
      {picker === 'unsplash' && (
        <div className={styles.imageImport}>
          <div className={styles.unsplashSearch} role="search">
            <label className={styles.group}>
              <span className={styles.label}>Search Unsplash photos</span>
              <input
                className={styles.input}
                type="search"
                value={photoQuery}
                maxLength={100}
                required
                placeholder="Try architecture, markets or nature"
                onChange={(event) => setPhotoQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void searchPhotos();
                  }
                }}
              />
            </label>
            <button
              className={styles.addButton}
              type="button"
              disabled={photoBusy || !photoQuery.trim()}
              onClick={() => void searchPhotos()}
            >
              {photoBusy ? 'Searching…' : 'Search'}
            </button>
          </div>
          <p className={styles.hint}>
            Results are served directly from Unsplash. Selecting a photo records the required
            download event and keeps photographer credit on the public note.
          </p>
          {photoError && (
            <p className={styles.error} role="alert">
              {photoError}
            </p>
          )}
          <div className={styles.unsplashGrid} aria-live="polite">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                className={styles.unsplashChoice}
                disabled={photoBusy}
                onClick={async () => {
                  setPhotoError(undefined);
                  setPhotoBusy(true);
                  try {
                    const response = await fetch('/admin/api/unsplash/', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'X-Portfolio-Admin': '1' },
                      body: JSON.stringify({ downloadLocation: photo.downloadLocation }),
                    });
                    const payload = (await response.json()) as { message?: string };
                    if (!response.ok) throw new Error(payload.message ?? 'Could not select photo.');
                    choose({
                      type: 'image',
                      unsplash: {
                        imageUrl: photo.imageUrl,
                        photoUrl: photo.photoUrl,
                        photographer: photo.photographer,
                        photographerUrl: photo.photographerUrl,
                      },
                      variation: 0,
                      word: selected?.type === 'image' ? draft.coverWord : imageDefault.word,
                      color: selected?.type === 'image' ? draft.coverColor : imageDefault.color,
                    });
                  } catch (cause) {
                    setPhotoError(
                      cause instanceof Error ? cause.message : 'Could not select photo.',
                    );
                  } finally {
                    setPhotoBusy(false);
                  }
                }}
              >
                <img src={photo.thumbnailUrl} alt="" />
                <span>{photo.description}</span>
                <small>Photo by {photo.photographer}</small>
              </button>
            ))}
          </div>
          {photos.length === 0 && !photoBusy && !photoError && (
            <p className={styles.hint}>Search to browse landscape photos.</p>
          )}
          <p className={styles.hint}>
            Photos by their respective photographers on{' '}
            <a href="https://unsplash.com/" target="_blank" rel="noreferrer">
              Unsplash
            </a>
            .
          </p>
        </div>
      )}
      <details className={styles.generateDetails}>
        <summary>Generate geometric variations</summary>
        <p className={styles.hint}>Create a fresh composition using the word and colour above.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.addButton} onClick={generate}>
            Generate cover
          </button>
          {selected && (
            <button type="button" className={styles.addButton} onClick={generate}>
              Try another variation
            </button>
          )}
          <button
            type="button"
            className={styles.sheetAction}
            onClick={() => {
              onEdited();
              const p = themeArtwork.find((p) => p.id === draft.theme)!;
              setDraft((c) => ({ ...c, cover: undefined, coverWord: p.word, coverColor: p.color }));
              setPicker('theme');
            }}
          >
            Use theme artwork
          </button>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </details>
      <p className={styles.hint} aria-live="polite">
        {selected
          ? `Selected: ${selected.word || 'Untitled'} · ${selected.color}. Save the note to keep it.`
          : 'Choose a design to customise its artwork.'}
      </p>
      {cropFile && (
        <ImageCropDialog
          file={cropFile}
          initialCrop={initialCrop}
          onCancel={() => setCropFile(undefined)}
          onApply={applyCrop}
        />
      )}
    </fieldset>
  );
}
