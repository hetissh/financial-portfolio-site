import { z } from 'zod';

export type RichMark = { type: 'bold' | 'italic' | 'link'; attrs?: { href: string } };
export type RichNode = { type: string; text?: string; attrs?: Record<string, unknown>; marks?: RichMark[]; content?: RichNode[] };
export type RichDocument = { version: 1; doc: RichNode };
const imageSource = /^\/images\/articles\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.webp$/;
export const articleImageId = (src: unknown) => typeof src === 'string' ? imageSource.exec(src)?.[1] : undefined;
export function safeRichLink(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000) return false;
  try { const url = new URL(value); return url.protocol === 'https:' || (url.protocol === 'mailto:' && /^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(value)); } catch { return false; }
}
function validDocument(value: unknown): value is RichDocument {
  if (!value || typeof value !== 'object') return false;
  const document = value as RichDocument;
  let count = 0, characters = 0;
  function node(n: RichNode, depth: number, allowed: string[]): boolean {
    if (!n || typeof n !== 'object' || ++count > 5000 || depth > 12 || !allowed.includes(n.type)) return false;
    const attrs = n.attrs ?? {};
    if (n.marks && (!Array.isArray(n.marks) || n.type !== 'text' || n.marks.some(m => !m || !['bold', 'italic', 'link'].includes(m.type) || (m.type === 'link' && !safeRichLink(m.attrs?.href))))) return false;
    if (n.type === 'text') { if (typeof n.text !== 'string' || !n.text.length) return false; characters += n.text.length; return characters <= 200000 && !n.content; }
    if (n.text !== undefined) return false;
    if (n.type === 'image') return Boolean(articleImageId(attrs.src)) && typeof attrs.alt === 'string' && attrs.alt.trim().length > 0 && attrs.alt.length <= 500 && (attrs.caption == null || typeof attrs.caption === 'string' && attrs.caption.length <= 500) && ['width', 'height'].every(k => Number.isInteger(attrs[k]) && Number(attrs[k]) > 0 && Number(attrs[k]) <= 10000) && [25, 50, 75, 100].includes(Number(attrs.displayWidth)) && !n.content;
    if (n.type === 'hardBreak') return !n.content;
    if (n.type === 'heading' && ![3, 4].includes(Number(attrs.level))) return false;
    if (n.type === 'orderedList' && (attrs.start !== undefined && (!Number.isInteger(attrs.start) || Number(attrs.start) < 1 || Number(attrs.start) > 10000) || attrs.type !== undefined && !['1', 'a', 'A'].includes(String(attrs.type)))) return false;
    const children = n.content ?? [];
    if (!Array.isArray(children)) return false;
    const block = ['paragraph', 'heading', 'bulletList', 'orderedList'];
    const childTypes = n.type === 'doc' ? block : n.type === 'listItem' ? ['paragraph', 'bulletList', 'orderedList'] : n.type.endsWith('List') ? ['listItem'] : ['text', 'hardBreak', 'image'];
    if (n.type.endsWith('List') && !children.length || n.type === 'listItem' && children[0]?.type !== 'paragraph') return false;
    return children.every(child => node(child, depth + 1, childTypes));
  }
  return document.version === 1 && document.doc?.type === 'doc' && node(document.doc, 0, ['doc']) && Boolean(richText(document.doc).trim() || richImageIds(document.doc).length);
}
export const richDocumentSchema = z.custom<RichDocument>(validDocument, 'Use supported formatting, valid links and uploaded images with alternative text. Keep content under 200,000 characters.');
export function richText(node: RichNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return ' ';
  if (node.type === 'image') return String(node.attrs?.caption ?? '');
  return (node.content ?? []).map(richText).join(node.type === 'paragraph' || node.type === 'heading' ? '' : ' ');
}
export function richImageIds(node: RichNode): string[] {
  const id = node.type === 'image' ? articleImageId(node.attrs?.src) : undefined;
  return [...(id ? [id] : []), ...(node.content ?? []).flatMap(richImageIds)];
}
export function paragraphsToDocument(paragraphs: string[]): RichDocument {
  return { version: 1, doc: { type: 'doc', content: paragraphs.length ? paragraphs.map(text => ({ type: 'paragraph', content: [{ type: 'text', text }] })) : [{ type: 'paragraph' }] } };
}
