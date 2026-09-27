"use client";
import { useEffect, useRef, useState } from 'react';
import { centeredCrop, cropRectangle, type ImageCrop } from '@/lib/image-crop';
import styles from './admin.module.css';
export function ImageCropDialog({ file, initialCrop, article = false, onCancel, onApply }: { file: File; initialCrop?: ImageCrop; article?: boolean; onCancel: () => void; onApply: (crop: ImageCrop, aspect?: number) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState<string>();
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>();
  const [crop, setCrop] = useState<ImageCrop>(initialCrop ?? centeredCrop);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  const [shape, setShape] = useState("original");
  const aspect = article ? shape === "original" ? dimensions ? dimensions.width / dimensions.height : 1.55 : Number(shape) : 1.55;
  const drag = useRef<{ x: number; y: number; crop: ImageCrop } | null>(null);
  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    // Each effect setup owns its URL, including React's development remount check.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(nextUrl);
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); URL.revokeObjectURL(nextUrl); };
  }, [file]);
  const rect = dimensions ? cropRectangle(dimensions.width, dimensions.height, crop, aspect) : undefined;
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  async function apply() { setBusy(true); setError(undefined); try { await onApply(crop, aspect); } catch (e) { setError(e instanceof Error ? e.message : 'Could not import this image.'); setBusy(false); } }
  return <dialog ref={dialog} className={styles.cropDialog} aria-labelledby="crop-heading" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="crop-heading">Crop your image</h2><p className={styles.hint}>Drag to frame the image, or use the sliders. {article ? "Choose a shape for this article image." : "This crop is used on the card and article."}</p>
    <div className={styles.cropViewport} style={{ touchAction: 'none', aspectRatio: aspect }} onPointerDown={event => { if (busy || !dimensions) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, crop }; }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onPointerMove={event => {
      if (!drag.current || !dimensions || !rect || busy) return;
      const box = event.currentTarget.getBoundingClientRect();
      const excessX = box.width * (dimensions.width / rect.width - 1), excessY = box.height * (dimensions.height / rect.height - 1);
      setCrop({ ...drag.current.crop, x: excessX > 0 ? clamp(drag.current.crop.x - (event.clientX - drag.current.x) / excessX) : .5, y: excessY > 0 ? clamp(drag.current.crop.y - (event.clientY - drag.current.y) / excessY) : .5 });
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Image crop preview" draggable={false} onLoad={event => { const img = event.currentTarget; if (img.naturalWidth < 2 || img.naturalHeight < 2) { setError('Choose an image at least 2 pixels wide and high.'); return; } if (img.naturalWidth * img.naturalHeight > 40_000_000) { setError('Choose an image under 40 megapixels.'); return; } setDimensions({ width: img.naturalWidth, height: img.naturalHeight }); }} onError={() => setError('Unable to read this image. Choose a JPEG, PNG or WebP.')} style={rect && dimensions ? { width: `${dimensions.width / rect.width * 100}%`, height: `${dimensions.height / rect.height * 100}%`, left: `${-rect.left / rect.width * 100}%`, top: `${-rect.top / rect.height * 100}%` } : { visibility: 'hidden' }} />
      <span className={styles.cropGrid} aria-hidden="true" />
    </div>
    <fieldset className={styles.editorLock} disabled={busy}><legend className={styles.srOnly}>Crop controls</legend>
      {article && <label className={styles.group}><span className={styles.label}>Crop shape</span><select className={styles.input} value={shape} onChange={e => setShape(e.target.value)}><option value="original">Original proportions</option><option value="1">Square</option><option value="1.55">Landscape</option><option value="0.75">Portrait</option></select></label>}
      <label className={styles.cropSlider}>Zoom <output>{crop.zoom.toFixed(1)}×</output><input aria-label="Crop zoom" type="range" min="1" max="5" step=".01" value={crop.zoom} onChange={e => setCrop(c => ({ ...c, zoom: Number(e.target.value) }))} /></label>
      <label className={styles.cropSlider}>Horizontal position <input aria-label="Crop horizontal position" type="range" min="0" max="1" step=".001" value={crop.x} onChange={e => setCrop(c => ({ ...c, x: Number(e.target.value) }))} /></label>
      <label className={styles.cropSlider}>Vertical position <input aria-label="Crop vertical position" type="range" min="0" max="1" step=".001" value={crop.y} onChange={e => setCrop(c => ({ ...c, y: Number(e.target.value) }))} /></label>
      <button className={styles.sheetAction} type="button" onClick={() => setCrop(centeredCrop)}>Reset crop</button>
    </fieldset>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className="button-primary" disabled={busy || !dimensions} onClick={() => void apply()}>{busy ? 'Importing…' : 'Use this crop'}</button></div>
  </dialog>;
}
