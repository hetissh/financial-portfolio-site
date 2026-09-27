"use client";
import { useState } from 'react';
import { themeArtwork, heroPatterns, heroAppearanceDefaults, legacyHeroOpacity, imageDefault } from '@/lib/artwork';
import { coverInk } from '@/lib/word-cover';
import type { ResearchDraft } from '@/lib/admin/form';
import type { WordCover } from '@/lib/content-schema';
import type { ImageCrop } from '@/lib/image-crop';
import { ResearchArt } from '@/components/ResearchArt';
import { Field } from './fields';
import { ImageCropDialog } from './ImageCropDialog';
import styles from './admin.module.css';
export function ArtworkEditor({ draft, setDraft, issues, onBusy, generate, error, onEdited }: { draft: ResearchDraft; setDraft: React.Dispatch<React.SetStateAction<ResearchDraft>>; issues: Map<string, string[]>; onBusy: (busy: boolean) => void; generate: () => void; error?: string; onEdited: () => void }) {
  const [picker, setPicker] = useState<'theme' | 'hero' | 'image'>(draft.cover?.type === 'hero' ? 'hero' : draft.cover?.type === 'image' ? 'image' : 'theme');
  const [query, setQuery] = useState('');
  const [imageError, setImageError] = useState<string>();
  const [cropFile, setCropFile] = useState<File>(); const [initialCrop, setInitialCrop] = useState<ImageCrop>();
  const selected = draft.cover;
  const isHero = selected?.type === 'hero';
  const backgroundColor = /^#[0-9a-fA-F]{6}$/.test(draft.coverColor) ? draft.coverColor : '#dce3e6';
  const foregroundColor = selected?.foregroundColor ?? coverInk(backgroundColor);
  const foregroundOpacity = selected?.foregroundOpacity ?? legacyHeroOpacity;
  function setAppearance(patch: Partial<WordCover>) {
    onEdited();
    setDraft(current => current.cover?.type === 'hero' ? { ...current, cover: { ...current.cover, ...patch } } : current);
  }
  function choose(cover: WordCover) { onEdited(); setDraft(c => ({ ...c, cover, coverWord: cover.word, coverColor: cover.color })); }
  function customize(field: 'word' | 'color', value: string) {
    onEdited();
    setDraft(c => ({ ...c, [field === 'word' ? 'coverWord' : 'coverColor']: value, cover: { ...(c.cover ?? { type: 'theme', preset: c.theme, variation: 0, word: c.coverWord, color: c.coverColor }), [field]: value } }));
  }
  const filtered = heroPatterns.filter(p => p.label.toLowerCase().includes(query.toLowerCase()));
  function importFile(file?: File) {
    if (!file) return;
    setImageError(undefined);
    if (!/\.(jpe?g|png|webp)$/i.test(file.name) || file.size > 10 * 1024 * 1024) { setImageError('Choose a JPEG, PNG or WebP image up to 10 MB.'); return; }
    setInitialCrop(undefined); setCropFile(file);
  }
  async function recrop() {
    setImageError(undefined); onBusy(true);
    try { const response = await fetch(`/admin/api/images/${selected?.imageId}/?original=1`); if (!response.ok) throw new Error('Original image is missing. Import it again.'); setInitialCrop(selected?.crop); setCropFile(new File([await response.blob()], 'cover.webp', { type: 'image/webp' })); }
    catch (e) { setImageError(e instanceof Error ? e.message : 'Could not open image.'); } finally { onBusy(false); }
  }
  async function applyCrop(crop: ImageCrop) {
    onBusy(true);
    try {
      const body = new FormData(); body.set('file', cropFile!); body.set('crop', JSON.stringify(crop));
      const response = await fetch('/admin/api/images/', { method: 'POST', headers: { 'X-Portfolio-Admin': '1' }, body });
      const result = await response.json(); if (!response.ok) throw new Error(result.message ?? 'Could not import image.');
      choose({ type: 'image', imageId: result.id, crop: result.crop, variation: 0, word: selected?.type === 'image' ? draft.coverWord : imageDefault.word, color: selected?.type === 'image' ? draft.coverColor : imageDefault.color });
      setCropFile(undefined);
    } finally { onBusy(false); }
  }
  return <fieldset className={styles.fieldset} id="editor-cover"><legend className={styles.legend}>Cover artwork</legend>
    <p className={styles.intro}>Choose a design, then make its word and colour your own. Your selection appears immediately in the card preview.</p>
    <div className={styles.artworkTabs} aria-label="Artwork sources">{(['theme', 'hero', 'image'] as const).map(p => <button type="button" key={p} aria-pressed={picker === p} onClick={() => setPicker(p)}>{p === 'theme' ? 'Theme artwork' : p === 'hero' ? 'Hero Patterns' : 'Import image'}</button>)}</div>
    <div className={styles.artworkCustomize} id="artwork-customize">
      <div className={styles.artworkPreview}><span className={styles.label}>Selected artwork</span><ResearchArt theme={draft.theme} cover={selected} /></div>
      <div>
      <Field field="cover.word" label="Cover word" hint="One word, up to 32 characters." issues={issues}>{props => <input {...props} className={styles.input} maxLength={32} value={draft.coverWord} onChange={e => customize('word', e.target.value)} />}</Field>
      {picker !== 'hero' && <Field field="cover.color" label="Cover colour" issues={issues}>{props => <div className={styles.coverColour}><input aria-label="Pick cover colour" type="color" value={/^#[0-9a-fA-F]{6}$/.test(draft.coverColor) ? draft.coverColor : '#dbe3d5'} onChange={e => customize('color', e.target.value)} /><input {...props} className={styles.input} autoComplete="off" value={draft.coverColor} maxLength={7} spellCheck={false} onChange={e => customize('color', e.target.value)} /></div>}</Field>}
      </div>
    </div>
    {picker === 'hero' && <fieldset className={styles.patternControls} disabled={!isHero}><legend className={styles.srOnly}>Pattern appearance</legend>
      <Field field="cover.foregroundColor" label="Foreground colour" issues={issues}>{props => <div className={styles.coverColour}><input type="color" aria-label="Pick foreground colour" value={/^#[0-9a-fA-F]{6}$/.test(foregroundColor) ? foregroundColor : '#000000'} onChange={e => setAppearance({ foregroundColor: e.target.value })} /><input {...props} className={styles.input} autoComplete="off" value={foregroundColor} maxLength={7} spellCheck={false} onChange={e => setAppearance({ foregroundColor: e.target.value })} /></div>}</Field>
      <Field field="cover.color" label="Background colour" issues={issues}>{props => <div className={styles.coverColour}><input type="color" aria-label="Pick background colour" value={backgroundColor} onChange={e => customize('color', e.target.value)} /><input {...props} className={styles.input} autoComplete="off" value={draft.coverColor} maxLength={7} spellCheck={false} onChange={e => customize('color', e.target.value)} /></div>}</Field>
      <Field field="cover.foregroundOpacity" label="Foreground opacity" issues={issues}>{props => <div className={styles.patternOpacity}><input {...props} type="range" min="0" max="1" step="0.01" value={foregroundOpacity} aria-valuetext={`${Math.round(foregroundOpacity * 100)} percent`} onChange={e => setAppearance({ foregroundOpacity: Number(e.target.value) })} /><span>{Math.round(foregroundOpacity * 100)}%</span></div>}</Field>
    </fieldset>}
    {picker === 'hero' && !isHero && <p className={styles.hint}>Choose a pattern below to edit its appearance.</p>}
    {picker === 'theme' && <div className={styles.artworkGrid} aria-label="Theme artwork choices">{themeArtwork.map(p => {
      const cover: WordCover = { type: 'theme', preset: p.id, word: p.word, color: p.color, variation: 0 };
      return <button type="button" className={styles.artworkChoice} key={p.id} aria-label={`Choose ${p.label} artwork`} aria-pressed={selected?.type === 'theme' ? selected.preset === p.id : !selected && draft.theme === p.id} onClick={() => choose(cover)}><ResearchArt theme="forest" cover={cover} /><span>{p.label}</span></button>;
    })}</div>}
    {picker === 'hero' && <><label className={styles.group}><span className={styles.label}>Find a pattern</span><input className={styles.input} type="search" value={query} placeholder="Try circles, waves or hexagons" onChange={e => setQuery(e.target.value)} /></label>
      <p className={styles.hint}>{filtered.length} of {heroPatterns.length} patterns</p>
      <div className={styles.artworkGrid} aria-label="Hero Pattern choices">{filtered.map(p => {
        const cover: WordCover = { type: 'hero', hero: p.id, word: p.word, color: p.color, variation: 0, ...heroAppearanceDefaults };
        return <button type="button" className={styles.artworkChoice} key={p.id} aria-label={`Choose ${p.label} pattern`} aria-pressed={selected?.type === 'hero' && selected.hero === p.id} onClick={() => { choose(cover); document.getElementById('artwork-customize')?.scrollIntoView({ block: 'start' }); }}><ResearchArt theme="forest" cover={cover} /><span>{p.label}</span></button>;
      })}</div>
      {!filtered.length && <p className={styles.hint}>No matching patterns. Try another name.</p>}
      <p className={styles.hint}>Patterns by <a href="https://heropatterns.com/" target="_blank" rel="noreferrer">Steve Schoger / Hero Patterns</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Colours adapted to your selection.</p></>}
    {picker === 'image' && <div className={styles.imageImport}><label className={styles.group}><span className={styles.label}>Choose an image</span><input className={styles.input} aria-label="Import cover image" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { importFile(e.target.files?.[0]); e.target.value = ''; }} /></label><p className={styles.hint}>JPEG, PNG or WebP · up to 10 MB. Choose a crop before applying.</p>{selected?.type === 'image' && <button type="button" className={styles.addButton} onClick={() => void recrop()}>Adjust image crop</button>}{imageError && <p className={styles.error} role="alert">{imageError}</p>}</div>}
    <details className={styles.generateDetails}><summary>Generate geometric variations</summary><p className={styles.hint}>Create a fresh composition using the word and colour above.</p><div className={styles.actions}><button type="button" className={styles.addButton} onClick={generate}>Generate cover</button>{selected && <button type="button" className={styles.addButton} onClick={generate}>Try another variation</button>}<button type="button" className={styles.sheetAction} onClick={() => { onEdited(); const p = themeArtwork.find(p => p.id === draft.theme)!; setDraft(c => ({ ...c, cover: undefined, coverWord: p.word, coverColor: p.color })); setPicker('theme'); }}>Use theme artwork</button></div>{error && <p className={styles.error} role="alert">{error}</p>}</details>
    <p className={styles.hint} aria-live="polite">{selected ? `Selected: ${selected.word || 'Untitled'} · ${selected.color}. Save the note to keep it.` : 'Choose a design to customise its artwork.'}</p>
    {cropFile && <ImageCropDialog file={cropFile} initialCrop={initialCrop} onCancel={() => setCropFile(undefined)} onApply={applyCrop} />}
  </fieldset>;
}
