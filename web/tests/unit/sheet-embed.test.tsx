import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import { attachmentSchema, researchSchema, visibleResearch } from '../../src/lib/content-schema';
import { parseEmbedInput, sheetEmbed, googleEmbedUrl, microsoftEmbedUrl } from '../../src/lib/sheet-embed';
import { draftToResearch, researchToDraft } from '../../src/lib/admin/form';
import { SheetEmbed } from '../../src/components/SheetEmbed';
const id = '11111111-1111-4111-8111-111111111111';
const google = 'https://docs.google.com/spreadsheets/d/e/published-demo/pubhtml?gid=123&range=A1%3AD20&widget=false';
const excel = 'https://onedrive.live.com/embed?resid=DEMO%21123&authkey=DEMO';
const base = JSON.parse(fs.readFileSync('src/content/research/beyond-the-bottom-line.json', 'utf8'));

describe('provider embeds and existing spreadsheet attachments', () => {
  it('accepts published Google URLs and preserves sheet/range/display settings', () => {
    const parsed = new URL(parseEmbedInput(google, 'google'));
    expect(parsed.searchParams.get('gid')).toBe('123'); expect(parsed.searchParams.get('range')).toBe('A1:D20');
    expect(parsed.searchParams.get('widget')).toBe('false'); expect(parsed.searchParams.get('headers')).toBe('true');
    expect(googleEmbedUrl.safeParse('https://docs.google.com/spreadsheets/d/private-id/edit').success).toBe(false);
    expect(googleEmbedUrl.safeParse('not a link').success).toBe(false);
  });
  it('supports generated OneDrive and SharePoint Excel embeds, while distinguishing ordinary sharing links', () => {
    for (const url of [excel, 'https://company.sharepoint.com/personal/person/_layouts/15/guestaccess.aspx?docid=DEMO&action=embedview', 'https://company.my.sharepoint.com/_layouts/15/Doc.aspx?sourcedoc=DEMO&action=embedview', 'https://company.sharepoint.com/:x:/s/Research/DEMO?action=embedview']) expect(microsoftEmbedUrl.safeParse(url).success).toBe(true);
    for (const url of ['https://1drv.ms/x/demo', 'https://onedrive.live.com/?id=DEMO', 'https://company.sharepoint.com/_layouts/15/Doc.aspx?sourcedoc=DEMO', 'https://onedrive.live.com/embed', 'bad url']) expect(microsoftEmbedUrl.safeParse(url).success).toBe(false);
  });
  it('extracts only a quoted iframe source, decodes query separators, and never executes pasted attributes', () => {
    const html = `<iframe width="640" src="${google.replaceAll('&', '&amp;')}" onload="alert(1)"></iframe>`;
    expect(parseEmbedInput(html, 'google')).toBe(parseEmbedInput(google, 'google'));
    expect(parseEmbedInput(`<iframe src='${excel}'></iframe>`, 'microsoft')).toBe(parseEmbedInput(excel, 'microsoft'));
    for (const input of ['<script>alert(1)</script>', `<iframe data-src="${google}"></iframe>`, `<iframe src=${google}></iframe>`, `<iframe src="${google}"></iframe><script>alert(1)</script>`, `<iframe srcdoc="test"></iframe>`]) expect(() => parseEmbedInput(input, 'google')).toThrow();
  });
  it('rejects unsafe schemes, fake provider suffixes, credentials, ports, unrelated paths and oversized input', () => {
    for (const provider of ['google', 'microsoft'] as const) for (const url of ['javascript:alert(1)', 'data:text/html,test', 'http://docs.google.com/spreadsheets/d/e/id/pubhtml', 'https://docs.google.com.evil.test/spreadsheets/d/e/id/pubhtml', 'https://onedrive.live.com.evil.test/embed?resid=DEMO', 'https://evilsharepoint.com/Doc.aspx?action=embedview', 'https://user:pass@onedrive.live.com/embed?resid=DEMO', 'https://onedrive.live.com:8443/embed?resid=DEMO', 'https://docs.google.com/forms/d/id/pubhtml']) expect(() => parseEmbedInput(url, provider)).toThrow();
    expect(() => parseEmbedInput('x'.repeat(8193), 'google')).toThrow('8192');
  });
  it('keeps legacy uploads and sharing links, detects a published link automatically, and validates server-side', () => {
    const upload = attachmentSchema.parse({ kind: 'excel', id, label: 'Upload' }); expect(sheetEmbed(upload)).toBeUndefined();
    const link = attachmentSchema.parse({ kind: 'google', id, label: 'Link', url: 'https://docs.google.com/spreadsheets/d/id/edit' }); expect(sheetEmbed(link)).toBeUndefined();
    const published = attachmentSchema.parse({ ...link, url: google }); expect(sheetEmbed(published)?.provider).toBe('Google Sheets');
    const hosted = attachmentSchema.parse({ kind: 'microsoft', id, label: 'Hosted', embedUrl: excel }); expect(sheetEmbed(hosted)?.originalUrl).toBe(hosted.embedUrl);
    expect(attachmentSchema.safeParse({ ...upload, embedUrl: 'https://evil.test/embed' }).success).toBe(false);
    expect(attachmentSchema.safeParse({ ...link, embedUrl: excel }).success).toBe(false);
    expect(attachmentSchema.safeParse({ ...hosted, originalUrl: 'javascript:alert(1)' }).success).toBe(false);
  });
  it('round-trips all attachment types and keeps sample/draft embed URLs out of production content', () => {
    const attachments = [{ kind: 'excel', id, label: 'Upload', embedUrl: excel }, { kind: 'google', id, label: 'Sheet', url: google, embedUrl: google }, { kind: 'microsoft', id, label: 'Cloud', embedUrl: excel, originalUrl: 'https://1drv.ms/x/demo' }];
    const note = researchSchema.parse({ ...base, attachments });
    expect(researchSchema.parse(draftToResearch(researchToDraft(note)))).toEqual(note);
    expect(visibleResearch([note, { ...note, id: 'sample', status: 'sample' }, { ...note, id: 'draft', status: 'draft' }], 'production').map(n => n.id)).toEqual([note.id]);
  });
  it('renders the native iframe and fallback link without JavaScript and blocks top-level navigation', () => {
    const html = renderToStaticMarkup(createElement(SheetEmbed, { label: '<My sheet>', provider: 'Google Sheets', url: parseEmbedInput(google, 'google'), originalUrl: google }));
    expect(html).toContain('<iframe'); expect(html).toContain('loading="lazy"'); expect(html).toContain('&lt;My sheet&gt;'); expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('role="region"'); expect(html).toContain('Open original'); expect(html).not.toContain('allow-top-navigation');
  });
});
