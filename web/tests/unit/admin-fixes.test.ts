import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { mkdtempSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { parseResearch, profileSchema, googleSheetUrl } from '../../src/lib/content-schema';
import { createResearch, updateResearch, saveProfile, trashResearch, recordVersion, VersionConflictError } from '../../src/lib/admin/store';
import { parseWorkbook, storeWorkbook, readWorkbookFile, getWorkbook } from '../../src/lib/admin/workbooks';
import { handleWrite } from '../../src/lib/admin/guard';
import { sendJson } from '../../src/components/admin/fields';
const base = parseResearch([{ ...JSON.parse(readFileSync('src/content/research/beyond-the-bottom-line.json', 'utf8')), attachments: [], cover: undefined }])[0];
const profile = profileSchema.parse(JSON.parse(readFileSync('src/content/profile.json', 'utf8')));
let root: string;
beforeEach(() => { root = mkdtempSync(path.join(tmpdir(), 'portfolio-fixes-')); mkdirSync(path.join(root, 'research')); writeFileSync(path.join(root, 'profile.json'), JSON.stringify(profile)); writeFileSync(path.join(root, 'research', `${base.slug}.json`), JSON.stringify(base)); });
afterEach(() => { rmSync(root, { recursive: true }); vi.unstubAllGlobals(); });
describe('reviewed admin fixes', () => {
  it('blocks stale note saves, stale deletes, and stale profile saves', () => {
    const version = recordVersion(base);
    updateResearch(base.id, { ...base, title: 'Newer change' }, { root, expectedVersion: version });
    expect(() => updateResearch(base.id, base, { root, expectedVersion: version })).toThrow(VersionConflictError);
    expect(() => trashResearch(base.id, { root, trashDir: path.join(root, 'trash'), expectedVersion: version })).toThrow(VersionConflictError);
    expect(JSON.parse(readFileSync(path.join(root, 'research', `${base.slug}.json`), 'utf8')).title).toBe('Newer change');
    const profileVersion = recordVersion(profile); saveProfile({ ...profile, role: 'New role' }, { root, expectedVersion: profileVersion });
    expect(() => saveProfile(profile, { root, expectedVersion: profileVersion })).toThrow(VersionConflictError);
  });
  it('does not reuse the ID of a removed note', () => {
    const options = { root, trashDir: path.join(root, 'trash') };
    const first = createResearch({ ...base, slug: 'first-new-note' }, options);
    trashResearch(first.id, options);
    const second = createResearch({ ...base, slug: 'second-new-note' }, options);
    expect(second.id).not.toBe(first.id);
  });
  it('recovers from a network failure instead of rejecting and leaving the form saving', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const result = await sendJson('/admin/api/profile/', 'PUT', profile, 'test-version');
    expect(result.ok).toBe(false); expect(result.payload.message).toContain('Your edits are still here');
  });
  it('bounds JSON bodies even without Content-Length', async () => {
    const prior = process.env.PORTFOLIO_ADMIN; process.env.PORTFOLIO_ADMIN = '1';
    try { const response = await handleWrite(new Request('http://127.0.0.1:3000/x', { method: 'PUT', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' }, body: JSON.stringify({ huge: 'x'.repeat(1024 * 1024) }) }), () => { throw new Error('Must not execute'); }); expect(response.status).toBe(413); }
    finally { if (prior === undefined) delete process.env.PORTFOLIO_ADMIN; else process.env.PORTFOLIO_ADMIN = prior; }
  });
  it('restricts spreadsheet links to Google Sheets HTTPS sharing URLs', () => {
    expect(googleSheetUrl.safeParse('https://docs.google.com/spreadsheets/d/example/edit#gid=0').success).toBe(true);
    for (const url of ['javascript:alert(1)', 'https://attacker.test/', 'https://docs.google.com.attacker.test/spreadsheets/d/x', 'https://docs.google.com/document/d/x', 'https://a:b@docs.google.com/spreadsheets/d/x']) expect(googleSheetUrl.safeParse(url).success).toBe(false);
  });
});
function buffer() { const book = XLSX.utils.book_new(); const sheet = XLSX.utils.aoa_to_sheet([['Metric', 'Value'], ['Revenue', 100], ['Profit', 25]]); sheet.B3 = { t: 'n', v: 25, f: 'B2*0.25' }; XLSX.utils.book_append_sheet(book, sheet, 'Model'); return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }); }
describe('Excel upload safety and previews', () => {
  it('preserves cached formulas, preview values and exact original bytes', async () => {
    const bytes = buffer(); const { attachment } = await storeWorkbook(bytes, 'Model.xlsx', root);
    expect(getWorkbook(attachment.id, root)?.preview.sheets[0].rows[2][1]).toEqual({ value: '25', formula: 'B2*0.25' });
    expect(readWorkbookFile(attachment.id, root).equals(bytes)).toBe(true);
    const record = createResearch({ ...base, slug: 'with-model', attachments: [attachment] }, { root });
    expect(record.attachments).toEqual([attachment]);
  });
  it('rejects invalid archives, macro extensions, oversized uploads, and missing workbook sources', async () => {
    await expect(parseWorkbook(Buffer.from('<html>not excel</html>'))).rejects.toThrow();
    await expect(storeWorkbook(buffer(), 'Macros.xlsm', root)).rejects.toThrow();
    await expect(storeWorkbook(Buffer.alloc(5 * 1024 * 1024 + 1), 'Huge.xlsx', root)).rejects.toThrow();
    expect(() => createResearch({ ...base, slug: 'missing-model', attachments: [{ kind: 'excel', id: crypto.randomUUID(), label: 'Missing' }] }, { root })).toThrow('source file is missing');
  });
  it('bounds previews and keeps formula text as data', async () => {
    const book = XLSX.utils.book_new(); const sheet = XLSX.utils.aoa_to_sheet(Array.from({ length: 250 }, (_, r) => Array.from({ length: 35 }, (_, c) => `${r}:${c}`))); sheet.A1 = { t: 's', v: '<script>alert(1)</script>' }; XLSX.utils.book_append_sheet(book, sheet, 'Large');
    const preview = await parseWorkbook(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));
    expect(preview.sheets[0].rows).toHaveLength(200); expect(preview.sheets[0].rows[0]).toHaveLength(30); expect(preview.sheets[0].truncated).toBe(true); expect(preview.sheets[0].rows[0][0].value).toBe('<script>alert(1)</script>');
  });
});
