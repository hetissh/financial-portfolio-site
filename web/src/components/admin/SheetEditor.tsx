'use client';
import { useState } from 'react';
import { FileSpreadsheet, Plus, Upload, X } from 'lucide-react';
import { googleSheetUrl, type Attachment } from '@/lib/content-schema';
import type { WorkbookPreview } from '@/lib/admin/workbooks';
import { WorkbookViewer } from '@/components/WorkbookViewer';
import styles from './admin.module.css';
export function SheetEditor({ attachments, onChange, onBusy }: { attachments: Attachment[]; onChange: (attachments: Attachment[]) => void; onBusy: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<{ label: string; data: WorkbookPreview } | null>(null);
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); onBusy(true); setError('');
    try {
      const body = new FormData(); body.set('file', file);
      const result = await fetch('/admin/api/workbooks/', { method: 'POST', headers: { 'X-Portfolio-Admin': '1' }, body });
      const value = await result.json(); if (!result.ok) throw new Error(value.message);
      onChange([...attachments, value.attachment]); setPreview({ label: value.attachment.label, data: value.preview });
    } catch (error) { setError(error instanceof Error ? error.message : 'Upload failed. Try again.'); }
    finally { setBusy(false); onBusy(false); }
  }
  async function showPreview(attachment: Attachment) {
    setError('');
    try { const result = await fetch(`/admin/api/workbooks/${attachment.id}/?preview=1`); if (!result.ok) throw new Error('Unable to read this workbook. Try uploading it again.'); setPreview({ label: attachment.label, data: await result.json() }); }
    catch (error) { setError((error as Error).message); }
  }
  return <fieldset className={styles.fieldset} disabled={busy} id="editor-sheets"><legend className={styles.legend}>Sheets &amp; models</legend><p className={styles.intro}>Attach the spreadsheets behind this note. Save the note after adding, renaming, or removing a sheet.</p>
    {error && <p role="alert" className={styles.uploadError}>{error}</p>}
    {attachments.map((attachment, index) => <div className={styles.sheetItem} key={attachment.id}><FileSpreadsheet size={22} aria-hidden="true" /><div><label className={styles.label} htmlFor={`sheet-name-${attachment.id}`}>Sheet {index + 1} name</label><input id={`sheet-name-${attachment.id}`} className={styles.input} value={attachment.label} maxLength={120} onChange={e => onChange(attachments.map(a => a.id === attachment.id ? { ...a, label: e.target.value } : a))} /><p className={styles.hint}>{attachment.kind === 'excel' ? 'Excel workbook' : 'Google Sheets'}</p>{attachment.kind === 'google' && <label className={styles.sheetUrl}>Sheet {index + 1} link<input className={styles.input} type="url" value={attachment.url} onChange={e => onChange(attachments.map(a => a.id === attachment.id ? { ...attachment, url: e.target.value } : a))} /></label>}<div className={styles.actions}>{attachment.kind === 'excel' ? <button className={styles.sheetAction} type="button" onClick={() => void showPreview(attachment)}>Preview workbook</button> : <a className={styles.sheetAction} href={attachment.url} target="_blank" rel="noopener noreferrer">Open Google Sheet ↗</a>}<button className={styles.sheetAction} type="button" onClick={() => { onChange(attachments.filter(a => a.id !== attachment.id)); setPreview(null); }}><X size={14} aria-hidden="true" /> Remove attachment</button></div></div></div>)}
    {attachments.length < 12 && <><div className={styles.upload}><Upload size={23} aria-hidden="true" /><div><label className={styles.label}>Upload Excel workbook<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label><p className={styles.hint}>.xlsx · up to 5 MB · no macros or external workbook links. Publishing includes the original file, including hidden content.</p>{busy && <p role="status">Reading workbook…</p>}</div></div><div className={styles.google}><h3>Connect a Google Sheet</h3><label className={styles.sheetUrl}>Google Sheet name<input className={styles.input} value={label} maxLength={120} onChange={e => setLabel(e.target.value)} /></label><label className={styles.sheetUrl}>Google Sheets sharing link<input className={styles.input} type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" /></label><p className={styles.hint}>Visitors need access in Google Sheets. Attaching a link does not change its sharing settings.</p><button className={styles.addButton} type="button" onClick={() => { if (!label.trim() || !googleSheetUrl.safeParse(url.trim()).success) { setError('Enter a sheet name and a valid Google Sheets sharing link.'); return; } onChange([...attachments, { kind: 'google', id: crypto.randomUUID(), label: label.trim(), url: url.trim() }]); setLabel(''); setUrl(''); setError(''); }}><Plus size={15} aria-hidden="true" /> Attach Google Sheet</button></div></>}
    {preview && <div className={styles.sheetPreview}><div className={styles.panelHead}><h3>{preview.label}</h3><button className={styles.sheetAction} type="button" onClick={() => setPreview(null)}>Close preview</button></div><WorkbookViewer preview={preview.data} label={preview.label} /></div>}
  </fieldset>;
}
