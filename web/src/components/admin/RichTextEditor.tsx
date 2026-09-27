"use client";
import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { ListItem, OrderedList } from '@tiptap/extension-list';
import { articleImageId, safeRichLink, type RichDocument, type RichNode } from '@/lib/rich-content';
import type { ImageCrop } from '@/lib/image-crop';
import { ImageCropDialog } from './ImageCropDialog';
import styles from './admin.module.css';

const NestedListItem = ListItem.extend({
  priority: 1000,
  addKeyboardShortcuts() {
    return { ...this.parent?.(), Tab: () => this.editor.isActive('listItem') && (this.editor.state.selection.$from.depth >= 11 || this.editor.commands.sinkListItem(this.name)), 'Shift-Enter': () => {
      if (!this.editor.isActive('listItem')) return false;
      // Five levels fit the saved document's depth limit. Outside lists,
      // StarterKit keeps Shift+Enter's usual soft line break.
      if (this.editor.state.selection.$from.depth >= 11) return true;
      return this.editor.chain().splitListItem(this.name).sinkListItem(this.name).run();
    } };
  },
});
const LetteredList = OrderedList.extend({
  addAttributes() { return { ...this.parent?.(), type: { default: '1', parseHTML: el => el.getAttribute('type') ?? '1', renderHTML: attrs => ({ type: attrs.type, 'data-list-style': attrs.type === 'a' ? 'lower-alpha' : attrs.type === 'A' ? 'upper-alpha' : 'decimal' }) } }; },
});
function InlineImageView({ node, editor, getPos, selected }: NodeViewProps) {
  const attrs = node.attrs, id = articleImageId(attrs.src);
  function select() { const pos = getPos(); if (typeof pos === 'number') editor.chain().focus().setNodeSelection(pos).run(); }
  return <NodeViewWrapper as="span" className={`editor-article-image${selected ? ' ProseMirror-selectednode' : ''}`} style={{ width: `${attrs.displayWidth}%` }} contentEditable={false} role="button" tabIndex={0} aria-label={`Edit image: ${attrs.alt}`} onClick={(event: React.MouseEvent<HTMLSpanElement>) => { event.preventDefault(); event.stopPropagation(); select(); }} onKeyDown={(event: React.KeyboardEvent<HTMLSpanElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={id ? `/admin/api/images/${id}/` : ''} alt={attrs.alt} width={attrs.width} height={attrs.height} />
    {attrs.caption && <small>{attrs.caption}</small>}
  </NodeViewWrapper>;
}
const ArticleImage = Image.extend({
  addNodeView() { return ReactNodeViewRenderer(InlineImageView); },
  addAttributes() { return { ...this.parent?.(), src: { default: null, parseHTML: el => { const src = el.getAttribute('src') ?? ''; const id = /^\/admin\/api\/images\/([0-9a-f-]{36})\/$/.exec(src)?.[1]; return id ? `/images/articles/${id}.webp` : src; } }, caption: { default: '', parseHTML: el => el.parentElement?.querySelector('small')?.textContent ?? '' }, displayWidth: { default: 100, parseHTML: el => parseFloat(el.closest<HTMLElement>('.editor-article-image')?.style.width ?? '') || 100 }, width: { default: null, parseHTML: el => Number(el.getAttribute('width')) || null }, height: { default: null, parseHTML: el => Number(el.getAttribute('height')) || null } }; },
  renderHTML({ HTMLAttributes }) {
    const id = articleImageId(HTMLAttributes.src);
    // Imported images retain public paths in JSON; the local editor reads private copies.
    return ['span', { class: 'editor-article-image', style: `width:${HTMLAttributes.displayWidth}%`, contenteditable: 'false' }, ['img', { src: id ? `/admin/api/images/${id}/` : '', alt: HTMLAttributes.alt, width: HTMLAttributes.width, height: HTMLAttributes.height }], ['small', {}, HTMLAttributes.caption ?? '']];
  },
}).configure({ inline: true, allowBase64: false });

type Props = { value: RichDocument; onChange: (value: RichDocument) => void; onBusy: (busy: boolean) => void; id: string; 'aria-invalid': boolean; 'aria-describedby'?: string; label: string; disabled: boolean; resetKey: number };
export function RichTextEditor({ value, onChange, onBusy, id, label, disabled, resetKey, ...aria }: Props) {
  const [error, setError] = useState<string>();
  const [cropFirst, setCropFirst] = useState(false);
  const [cropFile, setCropFile] = useState<File>();
  const [pasteFile, setPasteFile] = useState<File>();
  const [pasteBusy, setPasteBusy] = useState(false);
  const pasteDialog = useRef<HTMLDialogElement>(null);
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const linkDialog = useRef<HTMLDialogElement>(null);
  const emittedValues = useRef(new WeakSet<RichDocument>());
  const lastReset = useRef(resetKey);
  const imageWidth = useRef(100);
  const selection = useRef({ from: 0, to: 0 });
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [3, 4] }, orderedList: false, listItem: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false, strike: false, underline: false, link: { openOnClick: false, defaultProtocol: 'https', isAllowedUri: url => safeRichLink(url), shouldAutoLink: url => safeRichLink(url) } }), LetteredList, NestedListItem, ArticleImage],
    content: value.doc,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: { handleDOMEvents: { keydown(view, event) {
      // ProseMirror's iOS Enter fallback drops Shift. Handle the explicit
      // shortcut before that fallback, keeping ordinary mobile Enter intact.
      if (event.key === 'Enter' && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing && view.someProp('handleKeyDown', handler => handler(view, event))) { event.preventDefault(); return true; }
      return false;
    } }, handlePaste(view, event) {
      const files = Array.from(event.clipboardData?.items ?? []).filter(item => item.kind === 'file').map(item => item.getAsFile()).filter((file): file is File => Boolean(file));
      if (!files.length) files.push(...Array.from(event.clipboardData?.files ?? []));
      const file = files.find(file => file.type.startsWith('image/'));
      if (!file) return false;
      event.preventDefault();
      if (!view.editable) return true;
      const extension = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as Record<string, string>)[file.type];
      if (!extension || file.size > 10 * 1024 * 1024) { setError('Paste a JPEG, PNG or WebP image up to 10 MB.'); return true; }
      selection.current = { from: view.state.selection.from, to: view.state.selection.to };
      imageWidth.current = 100;
      setAlt(''); setCaption(''); setError(undefined);
      setPasteFile(new File([file], `pasted-image.${extension}`, { type: file.type }));
      return true;
    }, attributes: { id, role: 'textbox', 'aria-label': label, 'aria-multiline': 'true', 'aria-invalid': String(aria['aria-invalid']), ...(aria['aria-describedby'] ? { 'aria-describedby': aria['aria-describedby'] } : {}) } },
    onUpdate: ({ editor }) => { const next: RichDocument = { version: 1, doc: editor.getJSON() as RichNode }; emittedValues.current.add(next); onChange(next); },
  });
  useEffect(() => {
    // React can commit an earlier keystroke after the next editor transaction.
    // Never replay our own updates; only an explicit reset replaces the document.
    if (lastReset.current === resetKey && emittedValues.current.has(value)) return;
    lastReset.current = resetKey;
    let active = true; if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(value.doc)) queueMicrotask(() => { if (active && !editor.isDestroyed) editor.commands.setContent(value.doc, { emitUpdate: false }); }); return () => { active = false; }; }, [editor, value, resetKey]);
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  useEffect(() => { if (linkOpen) linkDialog.current?.showModal(); }, [linkOpen]);
  useEffect(() => { if (pasteFile) pasteDialog.current?.showModal(); }, [pasteFile]);
  if (!editor) return <p className={styles.hint}>Loading the writing editor…</p>;
  const selectedImage = editor.isActive('image') ? editor.getAttributes('image') : undefined;
  const run = (action: () => void) => { setError(undefined); action(); };
  function updateImage(patch: Record<string, unknown>) { const pos = editor!.state.selection.from; editor!.chain().updateAttributes('image', patch).setNodeSelection(pos).run(); }
  function closeLink() { linkDialog.current?.close(); setLinkOpen(false); }
  function applyLink() { const href = link.trim(); if (!safeRichLink(href)) { setError('Use a valid HTTPS or mailto: link.'); return; } closeLink(); editor!.chain().focus().extendMarkRange('link').setLink({ href }).run(); setError(undefined); }
  function list(type: '1' | 'a' | 'A') {
    if (editor!.isActive('orderedList')) editor!.chain().focus().updateAttributes('orderedList', { type }).run();
    else editor!.chain().focus().toggleOrderedList().updateAttributes('orderedList', { type }).run();
  }
  async function upload(file: File, crop?: ImageCrop, aspect?: number) {
    if (!alt.trim()) { setError('Add alternative text before importing an image.'); return; }
    setError(undefined); onBusy(true);
    try {
      const body = new FormData(); body.set('file', file); body.set('purpose', 'article');
      if (crop) { body.set('crop', JSON.stringify(crop)); body.set('aspect', String(aspect)); }
      const response = await fetch('/admin/api/images/', { method: 'POST', headers: { 'X-Portfolio-Admin': '1' }, body });
      const result = await response.json(); if (!response.ok) throw new Error(result.message ?? 'Could not import image.');
      pasteDialog.current?.close();
      editor!.chain().focus().insertContentAt(selection.current, { type: 'image', attrs: { src: result.src, alt: alt.trim(), caption: caption.trim(), title: null, width: result.width, height: result.height, displayWidth: imageWidth.current } }).run();
      setCropFile(undefined);
      return true;
    } catch (e) { const message = e instanceof Error ? e.message : 'Could not import image.'; setError(message); if (crop) throw e; return false; }
    finally { onBusy(false); }
  }
  async function insertPasted() {
    if (!pasteFile || pasteBusy || !alt.trim()) return;
    setPasteBusy(true);
    try { if (await upload(pasteFile)) setPasteFile(undefined); } finally { setPasteBusy(false); }
  }
  function importFile(file?: File) {
    if (!file) return;
    if (!alt.trim()) { setError('Add alternative text before importing an image.'); return; }
    if (file.size > 10 * 1024 * 1024 || !/\.(png|jpe?g|webp)$/i.test(file.name)) { setError('Choose a JPEG, PNG or WebP image up to 10 MB.'); return; }
    selection.current = { from: editor!.state.selection.from, to: editor!.state.selection.to };
    imageWidth.current = Number(editor!.getAttributes("image").displayWidth ?? 100);
    if (cropFirst) setCropFile(file); else void upload(file);
  }
  async function cropSelected() {
    const id = articleImageId(selectedImage?.src); if (!id) return;
    selection.current = { from: editor!.state.selection.from, to: editor!.state.selection.to };
    imageWidth.current = Number(editor!.getAttributes("image").displayWidth ?? 100);
    setAlt(selectedImage!.alt); setCaption(selectedImage!.caption ?? ''); setError(undefined); onBusy(true);
    try {
      const response = await fetch(`/admin/api/images/${id}/?original=1`); if (!response.ok) throw new Error('Original image is missing. Import it again.');
      setCropFile(new File([await response.blob()], 'article.webp', { type: 'image/webp' }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not open image.'); } finally { onBusy(false); }
  }
  return <div className={styles.richEditor}>
    <div className={styles.richToolbar} role="group" aria-label={`${label} formatting`} onMouseDown={event => { if ((event.target as HTMLElement).closest("button")) event.preventDefault(); }}>
      <button type="button" aria-pressed={editor.isActive('bold')} onClick={() => run(() => { editor.chain().focus().toggleBold().run(); })}><strong>Bold</strong></button>
      <button type="button" aria-pressed={editor.isActive('italic')} onClick={() => run(() => { editor.chain().focus().toggleItalic().run(); })}><em>Italic</em></button>
      <button type="button" aria-pressed={editor.isActive('paragraph')} onClick={() => { editor.chain().focus().setParagraph().run(); }}>Paragraph</button>
      <button type="button" aria-pressed={editor.isActive('heading', { level: 3 })} onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); }}>Subheading</button>
      <button type="button" aria-pressed={editor.isActive('heading', { level: 4 })} onClick={() => { editor.chain().focus().toggleHeading({ level: 4 }).run(); }}>Small heading</button>
      <button type="button" aria-pressed={editor.isActive('bulletList')} onClick={() => { editor.chain().focus().toggleBulletList().run(); }}>Bullets</button>
      <button type="button" aria-pressed={editor.isActive('orderedList', { type: '1' })} onClick={() => list('1')}>1, 2, 3</button>
      <button type="button" aria-pressed={editor.isActive('orderedList', { type: 'a' })} onClick={() => list('a')}>a, b, c</button>
      <button type="button" aria-pressed={editor.isActive('orderedList', { type: 'A' })} onClick={() => list('A')}>A, B, C</button>
      <button type="button" disabled={editor.state.selection.$from.depth >= 11 || !editor.can().sinkListItem('listItem')} onClick={() => { editor.chain().focus().sinkListItem('listItem').run(); }}>Nest point</button>
      <button type="button" disabled={!editor.can().liftListItem('listItem')} onClick={() => { editor.chain().focus().liftListItem('listItem').run(); }}>Unnest point</button>
      <button type="button" aria-pressed={editor.isActive('link')} onClick={() => { setError(undefined); setLink(editor.getAttributes('link').href ?? ''); setLinkOpen(true); }}>Link</button>
      <button type="button" disabled={!editor.can().undo()} onClick={() => { editor.chain().focus().undo().run(); }}>Undo</button>
      <button type="button" disabled={!editor.can().redo()} onClick={() => { editor.chain().focus().redo().run(); }}>Redo</button>
    </div>
    <p className={`${styles.hint} ${styles.writingHint}`}>In a list, Shift+Enter creates a nested point. Tab nests an existing point; Shift+Tab moves it out. Up to five levels.</p>
    <EditorContent editor={editor} className={styles.richContent} />
    <div className={styles.articleImageControls}>
      {selectedImage && <div className={styles.imageSettings}><p className={styles.label}>Selected image</p>
        <label className={styles.group}><span className={styles.label}>Selected image alternative text</span><input className={styles.input} value={selectedImage.alt ?? ''} onChange={e => updateImage({ alt: e.target.value })} /></label>
        <label className={styles.group}><span className={styles.label}>Selected image caption</span><input className={styles.input} value={selectedImage.caption ?? ''} onChange={e => updateImage({ caption: e.target.value })} /></label>
        <label className={styles.group}><span className={styles.label}>Image width</span><select className={styles.input} value={selectedImage.displayWidth} onChange={e => updateImage({ displayWidth: Number(e.target.value) })}>{[25, 50, 75, 100].map(width => <option key={width} value={width}>{width}%</option>)}</select></label>
        <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => void cropSelected()}>Crop selected image</button><button type="button" className={styles.secondary} onClick={() => editor.chain().focus().deleteSelection().run()}>Remove selected image</button></div>
      </div>}
      <p className={styles.label}>{selectedImage ? 'Replace selected image' : 'Insert an image'}</p>
      <div className={styles.row2}>
        <label className={styles.group}><span className={styles.label}>Image alternative text</span><input className={styles.input} value={alt} maxLength={500} placeholder="Describe what the image shows" onChange={e => setAlt(e.target.value)} /></label>
        <label className={styles.group}><span className={styles.label}>Image caption (optional)</span><input className={styles.input} value={caption} maxLength={500} onChange={e => setCaption(e.target.value)} /></label>
      </div>
      <label className={styles.check}><input type="checkbox" checked={cropFirst} onChange={e => setCropFirst(e.target.checked)} /><span>Crop before inserting</span></label>
      <label className={styles.group}><span className={styles.label}>Import article image</span><input className={styles.input} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { importFile(e.target.files?.[0]); e.target.value = ''; }} /></label>
      <p className={styles.hint}>JPEG, PNG or WebP · up to 10 MB. Import or paste images at your cursor; images stay centered. Click an inserted image to edit its caption, size or crop.</p>
    </div>
    {error && !pasteFile && <p className={styles.error} role="alert">{error}</p>}
    {cropFile && <ImageCropDialog article file={cropFile} onCancel={() => setCropFile(undefined)} onApply={async (crop, aspect) => { await upload(cropFile, crop, aspect); }} />}
    {pasteFile && <dialog ref={pasteDialog} className={styles.cropDialog} aria-label="Paste image" onKeyDown={event => { if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") { event.preventDefault(); void insertPasted(); } }} onCancel={event => { event.preventDefault(); if (!pasteBusy) { setPasteFile(undefined); setError(undefined); } }}>
      <h2>Paste an image</h2><p className={styles.hint}>Add a description for readers who cannot see the image. It will be centered at your cursor.</p>
      <label className={styles.group}><span className={styles.label}>Pasted image alternative text</span><input autoFocus className={styles.input} maxLength={500} disabled={pasteBusy} value={alt} placeholder="Describe what the image shows" onChange={e => setAlt(e.target.value)} /></label>
      <label className={styles.group}><span className={styles.label}>Pasted image caption (optional)</span><input className={styles.input} maxLength={500} disabled={pasteBusy} value={caption} onChange={e => setCaption(e.target.value)} /></label>
      <p className={styles.hint}>You can change its width or crop it after inserting.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}><button type="button" className={styles.secondary} disabled={pasteBusy} onClick={() => { setPasteFile(undefined); setError(undefined); editor.chain().focus().setTextSelection(selection.current).run(); }}>Cancel</button><button type="button" className="button-primary" disabled={pasteBusy || !alt.trim()} onClick={() => void insertPasted()}>{pasteBusy ? 'Importing…' : 'Insert pasted image'}</button></div>
    </dialog>}
    {linkOpen && <dialog ref={linkDialog} className={styles.cropDialog} aria-label="Edit text link" onKeyDown={event => { if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") { event.preventDefault(); applyLink(); } }} onCancel={() => setLinkOpen(false)}>
      <label className={styles.group}><span className={styles.label}>Link address</span><input className={styles.input} value={link} placeholder="https://example.com" onChange={e => setLink(e.target.value)} /></label>
      <p className={styles.hint}>Use an HTTPS address or mailto: email address.</p>{error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => { closeLink(); editor.commands.focus(); }}>Cancel</button><button type="button" className={styles.secondary} onClick={() => { closeLink(); editor.chain().focus().extendMarkRange('link').unsetLink().run(); }}>Remove link</button><button type="button" className="button-primary" onClick={applyLink}>Apply link</button></div>
    </dialog>}
  </div>;
}
