'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Eye, GripVertical, PencilLine, Save } from 'lucide-react';
import type { Research } from '@/lib/content-schema';
import { automaticNoteNumber, noteNumber } from '@/lib/research-order';
import { ResearchArt } from '@/components/ResearchArt';
import { SaveStatus, sendJson, useEditorState, type SaveState } from './fields';
import styles from './admin.module.css';

export type OrganizerNote = Pick<Research, 'id' | 'slug' | 'title' | 'category' | 'status' | 'theme' | 'cover' | 'noteNumber'>;
const labels = { draft: 'Draft', sample: 'Example', published: 'Published' };
const ids = (notes: OrganizerNote[]) => notes.map(note => note.id);
type Drag = { id: string; pointerId: number; startX: number; startY: number; x: number; y: number; original: OrganizerNote[]; active: boolean };

export function ResearchOrganizer({ notes, version }: { notes: OrganizerNote[]; version: string }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const { draft, setDraft, dirty, markSaved, reset, ready } = useEditorState(notes, ids, form);
  const current = useRef(draft);
  useEffect(() => { current.current = draft; }, [draft]);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const drag = useRef<Drag | null>(null);
  const frame = useRef<number | undefined>(undefined);
  const [dragging, setDragging] = useState<string>();
  const [announcement, announce] = useState('');
  const [currentVersion, setVersion] = useState(version);
  const [state, setState] = useState<SaveState>({ tone: 'idle', text: 'Saved order' });
  const busy = state.tone === 'saving' || refreshing;

  function move(id: string, destination: number) {
    const previous = current.current;
    const index = previous.findIndex(note => note.id === id);
    if (index < 0 || destination < 0 || destination >= previous.length || index === destination) return;
    const next = [...previous];
    const [note] = next.splice(index, 1); next.splice(destination, 0, note);
    current.current = next; setDraft(next);
    announce(`${note.title} moved to position ${destination + 1} of ${next.length}. Save order to keep this arrangement.`);
    requestAnimationFrame(() => {
      handles.current.get(id)?.focus({ preventScroll: true });
      if (!drag.current) rows.current.get(id)?.scrollIntoView({ block: 'nearest' });
    });
  }

  useEffect(() => {
    function placeAtPointer() {
      const active = drag.current;
      if (!active?.active) return;
      const elements = [...rows.current.entries()].map(([id, node]) => ({ id, rect: node.getBoundingClientRect() }));
      // Ignore a pointer far outside the cards; dropping there keeps the current arrangement.
      if (!elements.some(({ rect }) => active.x >= rect.left - 24 && active.x <= rect.right + 24)) return;
      const over = document.elementFromPoint(active.x, active.y)?.closest<HTMLElement>('[data-note-id]')?.dataset.noteId;
      const target = elements.find(element => element.id === over) ?? elements.reduce<typeof elements[number] | undefined>((closest, element) => {
        const distance = (candidate: typeof element) => Math.hypot(active.x - (candidate.rect.left + candidate.rect.width / 2), active.y - (candidate.rect.top + candidate.rect.height / 2));
        return !closest || distance(element) < distance(closest) ? element : closest;
      }, undefined);
      if (!target || target.id === active.id) return;
      const previous = current.current;
      const from = previous.findIndex(note => note.id === active.id), to = previous.findIndex(note => note.id === target.id);
      if (from < 0 || to < 0) return;
      const source = rows.current.get(active.id)?.getBoundingClientRect();
      const sameRow = source && Math.abs(source.top - target.rect.top) < 8;
      const coordinate = sameRow ? active.x : active.y;
      const middle = sameRow ? target.rect.left + target.rect.width / 2 : target.rect.top + target.rect.height / 2;
      if ((to > from && coordinate < middle) || (to < from && coordinate > middle)) return;
      const next = [...previous]; const [note] = next.splice(from, 1); next.splice(to, 0, note);
      current.current = next; setDraft(next);
      announce(`${note.title} moved to position ${to + 1} of ${next.length}.`);
    }
    function tick() {
      const active = drag.current;
      if (!active?.active) { frame.current = undefined; return; }
      const margin = 80;
      const speed = active.y < margin ? -Math.ceil((margin - active.y) / 6) : active.y > innerHeight - margin ? Math.ceil((active.y - innerHeight + margin) / 6) : 0;
      if (speed) window.scrollBy(0, Math.max(-20, Math.min(20, speed)));
      placeAtPointer(); frame.current = requestAnimationFrame(tick);
    }
    function pointerMove(event: PointerEvent) {
      const active = drag.current;
      if (!active || event.pointerId !== active.pointerId) return;
      active.x = event.clientX; active.y = event.clientY;
      if (!active.active && Math.hypot(active.x - active.startX, active.y - active.startY) >= 6) {
        active.active = true; setDragging(active.id); frame.current = requestAnimationFrame(tick);
      }
      if (active.active) { event.preventDefault(); placeAtPointer(); }
    }
    function finish(cancel: boolean) {
      const active = drag.current;
      if (!active) return;
      drag.current = null; setDragging(undefined);
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      frame.current = undefined;
      if (cancel && active.active) {
        current.current = active.original; setDraft(active.original); announce('Drag cancelled. The previous arrangement is restored.');
      } else if (active.active) announce('Card placed. Save order to keep this arrangement.');
      if (active.active) requestAnimationFrame(() => handles.current.get(active.id)?.focus({ preventScroll: true }));
    }
    const up = (event: PointerEvent) => { if (event.pointerId === drag.current?.pointerId) finish(false); };
    const cancel = (event: PointerEvent) => { if (event.pointerId === drag.current?.pointerId) finish(true); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && drag.current) { event.preventDefault(); finish(true); } };
    const blur = () => finish(true);
    window.addEventListener('pointermove', pointerMove, { passive: false });
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', escape); window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('pointermove', pointerMove); window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel); window.removeEventListener('keydown', escape); window.removeEventListener('blur', blur);
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [setDraft]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || busy || drag.current || !dirty) return;
    setState({ tone: 'saving', text: 'Saving order…' });
    const { ok, payload } = await sendJson('/admin/api/research-order/', 'PUT', { ids: ids(draft) }, currentVersion);
    if (!ok) { setState({ tone: 'error', text: payload.message ?? 'Could not save the order. Your arrangement is still here.' }); return; }
    const record = payload.record as { ids: string[]; version: string };
    setVersion(record.version); markSaved(draft);
    setState({ tone: 'ok', text: 'Order saved' }); startRefresh(() => router.refresh());
  }

  return <form ref={form} onSubmit={save} autoComplete="off" data-order-version={currentVersion}>
    <p className={styles.organizerHint} id="organizer-help">Drag a handle to arrange the cards, then save the order. Use the arrow buttons, or focus a handle and press an arrow key. Home and End move to the first and last positions; Escape cancels a drag.</p>
    <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    <ol className={styles.organizerCards} aria-label="Research card order">
      {draft.map((note, index) => <li key={note.id} ref={node => { if (node) rows.current.set(note.id, node); else rows.current.delete(note.id); }} className={styles.organizerCard} data-note-id={note.id} data-dragging={dragging === note.id || undefined}>
        <div className={styles.organizerCardHead}>
          <button type="button" className={styles.dragHandle} disabled={!ready || busy} aria-label={`Reorder ${note.title}`} aria-describedby="organizer-help" ref={node => { if (node) handles.current.set(note.id, node); else handles.current.delete(note.id); }}
            onPointerDown={event => {
              if (!event.isPrimary || event.button !== 0 || !ready || busy) return;
              event.currentTarget.focus();
              drag.current = { id: note.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, original: [...current.current], active: false };
            }}
            onKeyDown={event => {
              const destination = { ArrowUp: index - 1, ArrowLeft: index - 1, ArrowDown: index + 1, ArrowRight: index + 1, Home: 0, End: draft.length - 1 }[event.key];
              if (destination !== undefined && !drag.current) { event.preventDefault(); move(note.id, destination); }
            }}><GripVertical size={18} aria-hidden="true" /><span className="small-label">{String(index + 1).padStart(2, '0')}</span></button>
          <span className={`${styles.badge} ${styles[`badge-${note.status}`]}`}>{labels[note.status]}</span>
          <div className={styles.iconButtons}>
            <button className={styles.iconButton} type="button" disabled={!ready || busy || index === 0} aria-label={`Move ${note.title} up`} onClick={() => move(note.id, index - 1)}><ArrowUp size={16} aria-hidden="true" /></button>
            <button className={styles.iconButton} type="button" disabled={!ready || busy || index === draft.length - 1} aria-label={`Move ${note.title} down`} onClick={() => move(note.id, index + 1)}><ArrowDown size={16} aria-hidden="true" /></button>
          </div>
        </div>
        <div className={styles.organizerArt}><ResearchArt theme={note.theme} cover={note.cover} number={noteNumber(note, automaticNoteNumber(draft, note.id))} /></div>
        <Link className={styles.noteTitle} href={`/admin/research/${encodeURIComponent(note.id)}/`}>{note.title}</Link>
        <span className={styles.noteMeta}>{note.category}</span>
        <div className={styles.rowActions}>
          <Link href={`/admin/research/${encodeURIComponent(note.id)}/`} aria-label={`Edit ${note.title}`}><PencilLine size={14} aria-hidden="true" /> Edit</Link>
          <Link href={`/admin/research/${encodeURIComponent(note.id)}/preview/`} aria-label={`Preview ${note.title}`}><Eye size={14} aria-hidden="true" /> Preview</Link>
        </div>
      </li>)}
    </ol>
    <div className={styles.saveBar}>
      <SaveStatus state={refreshing ? { tone: 'saving', text: 'Updating cards…' } : state} dirty={dirty} />
      <div className={styles.actions}>
        {state.tone === 'error' && <button type="button" className={styles.secondary} onClick={() => window.location.reload()}>Reload saved order</button>}
        <button type="button" className={styles.secondary} disabled={!ready || busy || !dirty || Boolean(dragging)} onClick={() => { reset(); setState({ tone: 'idle', text: 'Saved order' }); announce('Unsaved arrangement reset.'); }}>Reset order</button>
        <button type="submit" className="button-primary" disabled={!ready || busy || !dirty || Boolean(dragging)}><Save size={16} aria-hidden="true" />Save order</button>
      </div>
    </div>
  </form>;
}
