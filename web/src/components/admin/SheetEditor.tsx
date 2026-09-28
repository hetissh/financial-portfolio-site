'use client';
import { useState } from 'react';
import { FileSpreadsheet, Plus, Upload, X } from 'lucide-react';
import { attachmentSchema, googleSheetUrl, type Attachment } from '@/lib/content-schema';
import { parseEmbedInput, sheetEmbed } from '@/lib/sheet-embed';
import type { WorkbookPreview } from '@/lib/admin/workbooks';
import { WorkbookViewer } from '@/components/WorkbookViewer';
import { SheetEmbed } from '@/components/SheetEmbed';
import { Field } from './fields';
import styles from './admin.module.css';
type Preview = { kind: 'local'; label: string; data: WorkbookPreview } | { kind: 'embed'; attachment: Attachment };
const noIssues = new Map<string, string[]>();

export function SheetEditor({ attachments, onChange, onBusy, issues = noIssues }: { attachments: Attachment[]; onChange: (attachments: Attachment[]) => void; onBusy: (busy: boolean) => void; issues?: Map<string, string[]> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [googleEmbed, setGoogleEmbed] = useState('');
  const [excelLabel, setExcelLabel] = useState('');
  const [excelEmbed, setExcelEmbed] = useState('');
  const [excelOriginal, setExcelOriginal] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const failure = (cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not read this sheet. Try again.');
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); onBusy(true); setError('');
    try {
      const body = new FormData(); body.set('file', file);
      const result = await fetch('/admin/api/workbooks/', { method: 'POST', headers: { 'X-Portfolio-Admin': '1' }, body });
      const value = await result.json(); if (!result.ok) throw new Error(value.message);
      onChange([...attachments, value.attachment]); setPreview({ kind: 'local', label: value.attachment.label, data: value.preview });
    } catch (cause) { failure(cause); }
    finally { setBusy(false); onBusy(false); }
  }
  function googleAttachment() {
    if (!label.trim()) throw new Error('Enter a Google Sheet name.');
    const embedUrl = googleEmbed.trim() ? parseEmbedInput(googleEmbed, 'google') : undefined;
    const original = url.trim() || embedUrl || '';
    if (!googleSheetUrl.safeParse(original).success) throw new Error('Enter a sheet name and a valid Google Sheets sharing link.');
    return attachmentSchema.parse({ kind: 'google', id: crypto.randomUUID(), label, url: original, embedUrl });
  }
  function excelAttachment() {
    if (!excelLabel.trim()) throw new Error('Enter an Excel workbook name.');
    const embedUrl = parseEmbedInput(excelEmbed, 'microsoft');
    const parsed = attachmentSchema.safeParse({ kind: 'microsoft', id: crypto.randomUUID(), label: excelLabel, embedUrl, originalUrl: excelOriginal.trim() || undefined });
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    return parsed.data;
  }
  function showEmbed(attachment: Attachment) {
    if (!sheetEmbed(attachment)) throw new Error(attachment.kind === 'google' ? 'Add a published Google Sheets embed link to preview the sheet here.' : 'Add a generated Excel embed link to preview the workbook here.');
    setPreview({ kind: 'embed', attachment });
  }
  function connect(provider: 'google' | 'microsoft', previewOnly = false) {
    setError('');
    try {
      const attachment = provider === 'google' ? googleAttachment() : excelAttachment();
      if (previewOnly) { showEmbed(attachment); return; }
      onChange([...attachments, attachment]);
      if (sheetEmbed(attachment)) setPreview({ kind: 'embed', attachment });
      if (provider === 'google') { setLabel(''); setUrl(''); setGoogleEmbed(''); }
      else { setExcelLabel(''); setExcelEmbed(''); setExcelOriginal(''); }
    } catch (cause) { failure(cause); }
  }
  function change(id: string, field: 'label' | 'url' | 'embedUrl' | 'originalUrl', value: string) {
    onChange(attachments.map(attachment => {
      if (attachment.id !== id) return attachment;
      let next = value;
      if (field === 'embedUrl' && value.trim().startsWith('<')) {
        try { next = parseEmbedInput(value, attachment.kind === 'google' ? 'google' : 'microsoft'); } catch { /* Keep an incomplete paste for validation and correction. */ }
      }
      return { ...attachment, [field]: (field === 'embedUrl' || field === 'originalUrl') && !next.trim() ? undefined : next };
    }));
  }
  async function showPreview(attachment: Attachment) {
    setError('');
    if (attachment.embedUrl || attachment.kind !== 'excel') {
      try {
        const parsed = attachmentSchema.safeParse(attachment);
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        showEmbed(parsed.data);
      } catch (cause) { failure(cause); }
      return;
    }
    setBusy(true); onBusy(true);
    try {
      const result = await fetch(`/admin/api/workbooks/${attachment.id}/?preview=1`);
      if (!result.ok) throw new Error('Unable to read this workbook. Try uploading it again.');
      setPreview({ kind: 'local', label: attachment.label, data: await result.json() });
    } catch (cause) { failure(cause); }
    finally { setBusy(false); onBusy(false); }
  }
  const embedPreview = preview?.kind === 'embed' ? sheetEmbed(preview.attachment) : undefined;
  return <fieldset className={styles.fieldset} disabled={busy} id="editor-sheets"><legend className={styles.legend}>Sheets &amp; models</legend><p className={styles.intro}>Embed a hosted spreadsheet or upload an Excel file. Save the note after changing attachments.</p>
    {error && <p role="alert" className={styles.uploadError}>{error}</p>}
    {issues.get('attachments') && <p className={styles.error} id="field-attachments">{issues.get('attachments')!.join(' ')}</p>}
    {attachments.map((attachment, index) => <div className={styles.sheetItem} key={attachment.id}><FileSpreadsheet size={22} aria-hidden="true" /><div>
      <Field field={`attachments.${index}.label`} label={`Sheet ${index + 1} name`} issues={issues}>{props => <input {...props} className={styles.input} value={attachment.label} maxLength={120} onChange={event => change(attachment.id, 'label', event.target.value)} />}</Field>
      <p className={styles.hint}>{attachment.kind === 'google' ? 'Google Sheets' : attachment.kind === 'microsoft' ? 'Hosted Excel workbook' : 'Uploaded Excel workbook'}</p>
      {attachment.kind === 'google' && <Field field={`attachments.${index}.url`} label={`Sheet ${index + 1} link`} issues={issues}>{props => <input {...props} className={styles.input} type="url" value={attachment.url} onChange={event => change(attachment.id, 'url', event.target.value)} />}</Field>}
      <Field field={`attachments.${index}.embedUrl`} label={`Sheet ${index + 1} embed URL or code`} optional={attachment.kind !== 'microsoft'} hint={attachment.kind === 'google' ? 'Use Publish to web → Embed in Google Sheets. Without an embed link, this stays an Open sheet link.' : 'Paste the generated embed link or iframe from OneDrive or SharePoint. Uploaded files keep their local preview when this is blank.'} issues={issues}>{props => <textarea {...props} className={styles.input} rows={2} maxLength={8192} value={attachment.embedUrl ?? ''} onChange={event => change(attachment.id, 'embedUrl', event.target.value)} />}</Field>
      {attachment.kind !== 'google' && <Field field={`attachments.${index}.originalUrl`} label={`Sheet ${index + 1} original workbook link`} optional hint="Used by Open original. Defaults to the embed link." issues={issues}>{props => <input {...props} className={styles.input} type="url" value={attachment.originalUrl ?? ''} onChange={event => change(attachment.id, 'originalUrl', event.target.value)} />}</Field>}
      <div className={styles.actions}><button className={styles.sheetAction} type="button" onClick={() => void showPreview(attachment)}>{attachment.kind === 'excel' && !attachment.embedUrl ? 'Preview workbook' : 'Preview embed'}</button>
        {attachment.kind === 'google' && <a className={styles.sheetAction} href={googleSheetUrl.safeParse(attachment.url).success ? attachment.url : undefined} target="_blank" rel="noopener noreferrer">Open Google Sheet ↗</a>}
        <button className={styles.sheetAction} type="button" onClick={() => { onChange(attachments.filter(item => item.id !== attachment.id)); setPreview(null); }}><X size={14} aria-hidden="true" /> Remove attachment</button>
      </div>
    </div></div>)}
    {attachments.length < 12 && <><div className={styles.upload}><Upload size={23} aria-hidden="true" /><div><label className={styles.label}>Upload Excel workbook<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} /></label><p className={styles.hint}>.xlsx · up to 5 MB · no macros or external workbook links. Publishing includes the original file, including hidden content.</p>{busy && <p role="status">Reading workbook…</p>}</div></div>
      <div className={styles.google}><h3>Connect a Google Sheet</h3>
        <label className={styles.sheetUrl}>Google Sheet name<input className={styles.input} value={label} maxLength={120} onChange={event => setLabel(event.target.value)} /></label>
        <label className={styles.sheetUrl}>Google Sheets sharing link<input className={styles.input} type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" /></label>
        <div className={styles.sheetUrl}><label htmlFor="new-google-embed">Google Sheets embed URL or code</label><textarea id="new-google-embed" className={styles.input} rows={2} maxLength={8192} value={googleEmbed} onChange={event => setGoogleEmbed(event.target.value)} placeholder="Paste the published /pubhtml link or iframe code" /></div>
        <p className={styles.hint}>In Google Sheets, choose File → Share → Publish to web → Embed. You can publish selected sheets; the published view is read-only and does not show formulas. Only embed content intended for your visitors. A sharing link alone remains an Open sheet link.</p>
        <div className={styles.actions}><button className={styles.addButton} type="button" onClick={() => connect('google')}><Plus size={15} aria-hidden="true" /> Attach Google Sheet</button><button className={styles.sheetAction} type="button" onClick={() => connect('google', true)}>Preview Google embed</button></div>
      </div>
      <div className={styles.google}><h3>Embed an Excel workbook</h3>
        <label className={styles.sheetUrl}>Excel workbook name<input className={styles.input} value={excelLabel} maxLength={120} onChange={event => setExcelLabel(event.target.value)} /></label>
        <div className={styles.sheetUrl}><label htmlFor="new-excel-embed">Excel embed URL or code</label><textarea id="new-excel-embed" className={styles.input} rows={2} maxLength={8192} value={excelEmbed} onChange={event => setExcelEmbed(event.target.value)} placeholder="Paste the embed link or iframe from OneDrive or SharePoint" /></div>
        <label className={styles.sheetUrl}>Original Excel workbook link (optional)<input className={styles.input} type="url" value={excelOriginal} onChange={event => setExcelOriginal(event.target.value)} placeholder="https://onedrive.live.com/…" /></label>
        <p className={styles.hint}>Host the workbook on OneDrive or SharePoint, then use its Embed option. Visitors need permission to view it. This adds a hosted viewer; it does not upload your file to Microsoft.</p>
        <div className={styles.actions}><button className={styles.addButton} type="button" onClick={() => connect('microsoft')}><Plus size={15} aria-hidden="true" /> Attach Excel embed</button><button className={styles.sheetAction} type="button" onClick={() => connect('microsoft', true)}>Preview Excel embed</button></div>
      </div>
    </>}
    {preview && <div className={styles.sheetPreview}><div className={styles.panelHead}><h3>{preview.kind === 'local' ? preview.label : preview.attachment.label}</h3><button className={styles.sheetAction} type="button" onClick={() => setPreview(null)}>Close preview</button></div>{preview.kind === 'local' ? <WorkbookViewer preview={preview.data} label={preview.label} /> : embedPreview && <SheetEmbed label={preview.attachment.label} {...embedPreview} />}</div>}
  </fieldset>;
}
