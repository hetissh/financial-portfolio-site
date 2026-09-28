import { z } from 'zod';
import type { Attachment } from './content-schema';

function address(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port ? url : undefined;
  } catch { return undefined; }
}
const sheetPath = /^\/spreadsheets\/d\/(?:e\/)?[A-Za-z0-9_-]+(?:\/|$)/;
export const googleSheetUrl = z.string().trim().max(4096).url().refine(value => {
  const url = address(value);
  return Boolean(url && url.hostname === 'docs.google.com' && sheetPath.test(url.pathname));
}, 'Use a Google Sheets sharing link from docs.google.com/spreadsheets/d/...');
export const googleEmbedUrl = googleSheetUrl.refine(value => Boolean(address(value) && /\/pubhtml\/?$/.test(address(value)!.pathname)),
  'Use the published Google Sheets embed link ending in /pubhtml. In Sheets, choose File → Share → Publish to web → Embed.')
  .transform(value => {
    const url = new URL(value);
    url.hash = '';
    if (!url.searchParams.has('widget')) url.searchParams.set('widget', 'true');
    if (!url.searchParams.has('headers')) url.searchParams.set('headers', 'true');
    return url.href;
  });
function microsoftHost(url: URL) {
  return url.hostname === 'onedrive.live.com' || url.hostname === '1drv.ms'
    || /^[a-z0-9][a-z0-9-]*\.(?:my\.)?sharepoint\.com$/.test(url.hostname);
}
export const microsoftWorkbookUrl = z.string().trim().max(4096).url().refine(value => {
  const url = address(value); return Boolean(url && microsoftHost(url));
}, 'Use an HTTPS workbook link from OneDrive or SharePoint.');
export const microsoftEmbedUrl = microsoftWorkbookUrl.refine(value => {
  const url = address(value);
  if (!url) return false;
  if (url.hostname === 'onedrive.live.com') return /^\/embed\/?$/.test(url.pathname) && Boolean(url.searchParams.get('resid')?.trim() || url.searchParams.get('id')?.trim());
  return url.hostname.endsWith('.sharepoint.com') && url.searchParams.get('action')?.toLowerCase() === 'embedview'
    && (/\/(?:doc|guestaccess)\.aspx$/i.test(url.pathname) || /^\/:x:\//i.test(url.pathname));
}, 'Use the generated Excel embed link from OneDrive, or a SharePoint workbook link with action=embedview.')
  .transform(value => { const url = new URL(value); url.hash = ''; return url.href; });

/** Read only the src attribute; pasted HTML is never inserted into the page. */
export function parseEmbedInput(input: string, provider: 'google' | 'microsoft') {
  let value = input.trim();
  if (value.length > 8192) throw new Error('Use an embed URL or iframe code up to 8192 characters.');
  if (value.startsWith('<')) {
    const frame = /^<iframe\b([^>]*)>\s*<\/iframe>$/i.exec(value);
    const src = frame && /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(' ' + frame[1]);
    if (!src) throw new Error('Paste an embed URL or a single iframe with a quoted src attribute.');
    value = (src[1] ?? src[2]).replace(/&amp;|&#38;|&#x26;/gi, '&');
  }
  const result = (provider === 'google' ? googleEmbedUrl : microsoftEmbedUrl).safeParse(value);
  if (!result.success) throw new Error(result.error.issues[0].message);
  return result.data;
}
export function sheetEmbed(attachment: Attachment) {
  if (attachment.kind === 'google') {
    const result = googleEmbedUrl.safeParse(attachment.embedUrl || attachment.url);
    if (!result.success) return undefined;
    const original = googleSheetUrl.safeParse(attachment.url);
    return { provider: 'Google Sheets', url: result.data, originalUrl: original.success ? original.data : result.data };
  }
  const result = microsoftEmbedUrl.safeParse(attachment.embedUrl);
  if (!result.success) return undefined;
  const original = microsoftWorkbookUrl.safeParse(attachment.originalUrl);
  return { provider: 'Microsoft Excel', url: result.data, originalUrl: original.success ? original.data : result.data };
}
