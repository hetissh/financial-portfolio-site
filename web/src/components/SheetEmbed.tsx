'use client';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowUpRight, Maximize2, RotateCw, X } from 'lucide-react';
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function SheetEmbed({ label, provider, url, originalUrl }: { label: string; provider: string; url: string; originalUrl: string }) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [expanded, setExpanded] = useState(false);
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [expanded]);
  function collapse() {
    const element = dialog.current;
    if (!element) return;
    element.close(); element.show(); setExpanded(false);
    requestAnimationFrame(() => toggle.current?.focus({ preventScroll: true }));
  }
  function expand() {
    const element = dialog.current;
    if (!element) return;
    // The same iframe stays mounted. Native dialog promotion preserves its view.
    element.close(); element.showModal(); setExpanded(true);
    requestAnimationFrame(() => toggle.current?.focus({ preventScroll: true }));
  }
  return <dialog open ref={dialog} className="sheet-embed" role={expanded ? 'dialog' : 'region'} aria-modal={expanded || undefined} aria-labelledby={`${id}-heading`}
    onCancel={event => { event.preventDefault(); collapse(); }}
    onClose={() => {
      const element = dialog.current;
      // close() also fires while promoting the inline region to a modal.
      if (!element || element.matches(':modal')) return;
      if (!element.open) element.show();
      setExpanded(false);
    }}
    onClick={event => {
      if (!expanded || event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) collapse();
    }}>
    <header className="sheet-embed-head"><div><span className="sheet-embed-provider">{provider}</span><h3 id={`${id}-heading`}>{label}</h3></div>
      <div className="sheet-embed-actions"><a href={originalUrl} target="_blank" rel="noopener noreferrer" className="button-secondary">Open original <ArrowUpRight size={15} aria-hidden="true" /></a>
        <button type="button" className="button-secondary" disabled={!ready} onClick={() => { if (frame.current) frame.current.src = url; }} aria-label={`Reload ${label}`}><RotateCw size={15} aria-hidden="true" /><span>Reload</span></button>
        <button type="button" ref={toggle} className="button-secondary" disabled={!ready} onClick={expanded ? collapse : expand} aria-label={`${expanded ? 'Close' : 'Expand'} ${label}`}>{expanded ? <X size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}{expanded ? 'Close' : 'Expand'}</button>
      </div>
    </header>
    <iframe ref={frame} src={url} title={`${label} — ${provider} spreadsheet`} className="sheet-embed-frame" loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads" />
    <p className="sheet-embed-foot">Scroll inside the sheet to explore it. If it does not appear, <a href={originalUrl} target="_blank" rel="noopener noreferrer">open the original to check access</a>.</p>
  </dialog>;
}
