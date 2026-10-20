// Checks upload safety, content conflicts, and admin request regressions.
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import testAdminFixture from '../fixtures/admin-accounts.json' with { type: 'json' };
import fs, { mkdtempSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import sharp from 'sharp';
import { parseResearch, profileSchema, googleSheetUrl } from '../../src/lib/content-schema';
import {
  createResearch,
  updateResearch,
  saveProfile,
  trashResearch,
  recordVersion,
  VersionConflictError,
} from '../../src/lib/admin/store';
import {
  parseWorkbook,
  storeWorkbook,
  readWorkbookFile,
  getWorkbook,
} from '../../src/lib/admin/workbooks';
import { handleWrite } from '../../src/lib/admin/guard';
import { initializeAdmins, logIn } from '../../src/lib/admin/auth-store';
import { savedVersion, sendJson } from '../../src/components/admin/fields';
import {
  articleUploadSchema,
  coverUploadSchema,
  workbookPreviewSchema,
} from '../../src/lib/admin/client-response';
import { POST as uploadImage } from '../../src/app/admin/api/images/route.admin';
import { POST as uploadWorkbook } from '../../src/app/admin/api/workbooks/route.admin';
import {
  GET as searchUnsplash,
  POST as trackUnsplashSelection,
} from '../../src/app/admin/api/unsplash/route.admin';
import { storeCoverImage } from '../../src/lib/admin/images';
const base = parseResearch([
  {
    ...JSON.parse(readFileSync('tests/fixtures/research-note.json', 'utf8')),
    attachments: [],
    cover: undefined,
  },
])[0];
const profile = profileSchema.parse({
  ...JSON.parse(readFileSync('src/content/profile.json', 'utf8')),
  resume: undefined,
  resumeVisible: false,
  certifications: [],
});
let root: string;
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'portfolio-fixes-'));
  mkdirSync(path.join(root, 'research'));
  writeFileSync(path.join(root, 'profile.json'), JSON.stringify(profile));
  writeFileSync(path.join(root, 'research', `${base.slug}.json`), JSON.stringify(base));
});
afterEach(() => {
  rmSync(root, { recursive: true });
  vi.unstubAllGlobals();
});
describe('reviewed admin fixes', () => {
  it('searches Unsplash through the authenticated proxy and tracks a selected photo', async () => {
    const prior = {
      admin: process.env.PORTFOLIO_ADMIN,
      authFile: process.env.PORTFOLIO_AUTH_FILE,
      key: process.env.UNSPLASH_ACCESS_KEY,
    };
    process.env.PORTFOLIO_ADMIN = '1';
    process.env.PORTFOLIO_AUTH_FILE = path.join(root, 'auth.json');
    process.env.UNSPLASH_ACCESS_KEY = 'test-server-key';
    initializeAdmins([testAdminFixture.accounts[0], testAdminFixture.accounts[1]]);
    const token = logIn(testAdminFixture.accounts[0].email, testAdminFixture.accounts[0].password)!;
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          results: [
            {
              id: 'photo-1',
              alt_description: 'Blue hour city',
              urls: {
                small: 'https://images.unsplash.com/small',
                regular: 'https://images.unsplash.com/regular',
              },
              links: {
                html: 'https://unsplash.com/photos/photo-1',
                download_location: 'https://api.unsplash.com/photos/photo-1/download',
              },
              user: {
                name: 'Photographer',
                links: { html: 'https://unsplash.com/@photographer' },
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(Response.json({ url: 'https://images.unsplash.com/regular' }));
    vi.stubGlobal('fetch', mockFetch);
    const headers = {
      host: '127.0.0.1:3000',
      cookie: `portfolio_admin_session=${token}`,
    };
    try {
      const result = await searchUnsplash(
        new Request('http://127.0.0.1:3000/admin/api/unsplash/?query=city', { headers }),
      );
      expect(result.status).toBe(200);
      expect(await result.json()).toMatchObject({
        results: [
          { imageUrl: 'https://images.unsplash.com/regular', photographer: 'Photographer' },
        ],
      });
      expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({
        headers: { Authorization: 'Client-ID test-server-key' },
      });
      const tracked = await trackUnsplashSelection(
        new Request('http://127.0.0.1:3000/admin/api/unsplash/', {
          method: 'POST',
          headers: {
            ...headers,
            origin: 'http://127.0.0.1:3000',
            'content-type': 'application/json',
            'x-portfolio-admin': '1',
          },
          body: JSON.stringify({
            downloadLocation: 'https://api.unsplash.com/photos/photo-1/download',
          }),
        }),
      );
      expect(tracked.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const rejected = await trackUnsplashSelection(
        new Request('http://127.0.0.1:3000/admin/api/unsplash/', {
          method: 'POST',
          headers: {
            ...headers,
            origin: 'http://127.0.0.1:3000',
            'content-type': 'application/json',
            'x-portfolio-admin': '1',
          },
          body: JSON.stringify({ downloadLocation: 'https://example.com/private' }),
        }),
      );
      expect(rejected.status).toBe(400);
    } finally {
      if (prior.admin === undefined) delete process.env.PORTFOLIO_ADMIN;
      else process.env.PORTFOLIO_ADMIN = prior.admin;
      if (prior.authFile === undefined) delete process.env.PORTFOLIO_AUTH_FILE;
      else process.env.PORTFOLIO_AUTH_FILE = prior.authFile;
      if (prior.key === undefined) delete process.env.UNSPLASH_ACCESS_KEY;
      else process.env.UNSPLASH_ACCESS_KEY = prior.key;
    }
  });
  it('blocks stale note saves, stale deletes, and stale profile saves', () => {
    const version = recordVersion(base);
    updateResearch(base.id, { ...base, title: 'Newer change' }, { root, expectedVersion: version });
    expect(() => updateResearch(base.id, base, { root, expectedVersion: version })).toThrow(
      VersionConflictError,
    );
    expect(() =>
      trashResearch(base.id, {
        root,
        trashDir: path.join(root, 'trash'),
        expectedVersion: version,
      }),
    ).toThrow(VersionConflictError);
    expect(
      JSON.parse(readFileSync(path.join(root, 'research', `${base.slug}.json`), 'utf8')).title,
    ).toBe('Newer change');
    const profileVersion = recordVersion(profile);
    saveProfile({ ...profile, role: 'New role' }, { root, expectedVersion: profileVersion });
    expect(() => saveProfile(profile, { root, expectedVersion: profileVersion })).toThrow(
      VersionConflictError,
    );
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
    expect(result.ok).toBe(false);
    expect(result.payload.message).toContain('Your edits are still here');
  });
  it('treats malformed successful admin responses as failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(null)));
    const result = await sendJson('/admin/api/profile/', 'PUT', profile);
    expect(result.ok).toBe(false);
    expect(result.payload.message).toContain('invalid response');
    expect(savedVersion({ version: 'not-a-hash' })).toBeUndefined();
    expect(savedVersion({ version: 'a'.repeat(64) })).toBe('a'.repeat(64));
  });
  it('rejects malformed image and workbook response data before editor use', () => {
    const id = crypto.randomUUID();
    expect(coverUploadSchema.safeParse({ id, crop: { x: 0.5, y: 0.5, zoom: 1 } }).success).toBe(
      true,
    );
    expect(coverUploadSchema.safeParse({ id, crop: null }).success).toBe(false);
    expect(
      articleUploadSchema.safeParse({
        id,
        src: `/images/articles/${crypto.randomUUID()}.webp`,
        width: 100,
        height: 100,
      }).success,
    ).toBe(false);
    expect(workbookPreviewSchema.safeParse({ sheets: [{ rows: 'bad' }] }).success).toBe(false);
  });
  it('bounds JSON bodies even without Content-Length', async () => {
    const prior = process.env.PORTFOLIO_ADMIN;
    const priorFile = process.env.PORTFOLIO_AUTH_FILE;
    process.env.PORTFOLIO_ADMIN = '1';
    process.env.PORTFOLIO_AUTH_FILE = path.join(root, 'auth.json');
    initializeAdmins([testAdminFixture.accounts[0], testAdminFixture.accounts[1]]);
    const token = logIn(testAdminFixture.accounts[0].email, testAdminFixture.accounts[0].password)!;
    try {
      const response = await handleWrite(
        new Request('http://127.0.0.1:3000/x', {
          method: 'PUT',
          headers: {
            host: '127.0.0.1:3000',
            origin: 'http://127.0.0.1:3000',
            'content-type': 'application/json',
            cookie: `portfolio_admin_session=${token}`,
          },
          body: JSON.stringify({ huge: 'x'.repeat(1024 * 1024) }),
        }),
        () => {
          throw new Error('Must not execute');
        },
      );
      expect(response.status).toBe(413);
    } finally {
      if (prior === undefined) delete process.env.PORTFOLIO_ADMIN;
      else process.env.PORTFOLIO_ADMIN = prior;
      if (priorFile === undefined) delete process.env.PORTFOLIO_AUTH_FILE;
      else process.env.PORTFOLIO_AUTH_FILE = priorFile;
    }
  });
  it('restricts spreadsheet links to Google Sheets HTTPS sharing URLs', () => {
    expect(
      googleSheetUrl.safeParse('https://docs.google.com/spreadsheets/d/example/edit#gid=0').success,
    ).toBe(true);
    for (const url of [
      'javascript:alert(1)',
      'https://attacker.test/',
      'https://docs.google.com.attacker.test/spreadsheets/d/x',
      'https://docs.google.com/document/d/x',
      'https://a:b@docs.google.com/spreadsheets/d/x',
    ])
      expect(googleSheetUrl.safeParse(url).success).toBe(false);
  });
});
function buffer() {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Metric', 'Value'],
    ['Revenue', 100],
    ['Profit', 25],
  ]);
  sheet.B3 = { t: 'n', v: 25, f: 'B2*0.25' };
  XLSX.utils.book_append_sheet(book, sheet, 'Model');
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
}
describe('Excel upload safety and previews', () => {
  it('preserves cached formulas, preview values and exact original bytes', async () => {
    const bytes = buffer();
    const { attachment } = await storeWorkbook(bytes, 'Model.xlsx', root);
    expect(getWorkbook(attachment.id, root)?.preview.sheets[0].rows[2][1]).toEqual({
      value: '25',
      formula: 'B2*0.25',
    });
    expect(readWorkbookFile(attachment.id, root).equals(bytes)).toBe(true);
    const record = createResearch(
      { ...base, slug: 'with-model', attachments: [attachment] },
      { root },
    );
    expect(record.attachments).toEqual([attachment]);
  });
  it('rejects corrupt persisted workbook metadata before rendering or downloading it', async () => {
    const { attachment } = await storeWorkbook(buffer(), 'Model.xlsx', root);
    const metadata = path.join(root, 'workbooks', `${attachment.id}.json`);
    writeFileSync(metadata, JSON.stringify({ filename: 'Model.xlsx', preview: { sheets: 'bad' } }));
    expect(getWorkbook(attachment.id, root)).toBeNull();
  });
  it('rejects invalid archives, macro extensions, oversized uploads, and missing workbook sources', async () => {
    await expect(parseWorkbook(Buffer.from('<html>not excel</html>'))).rejects.toThrow();
    await expect(storeWorkbook(buffer(), 'Macros.xlsm', root)).rejects.toThrow();
    await expect(
      storeWorkbook(Buffer.alloc(5 * 1024 * 1024 + 1), 'Huge.xlsx', root),
    ).rejects.toThrow();
    expect(() =>
      createResearch(
        {
          ...base,
          slug: 'missing-model',
          attachments: [{ kind: 'excel', id: crypto.randomUUID(), label: 'Missing' }],
        },
        { root },
      ),
    ).toThrow('source file is missing');
  });
  it('bounds previews and keeps formula text as data', async () => {
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(
      Array.from({ length: 250 }, (_, r) => Array.from({ length: 35 }, (_, c) => `${r}:${c}`)),
    );
    sheet.A1 = { t: 's', v: '<script>alert(1)</script>' };
    XLSX.utils.book_append_sheet(book, sheet, 'Large');
    const preview = await parseWorkbook(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));
    expect(preview.sheets[0].rows).toHaveLength(200);
    expect(preview.sheets[0].rows[0]).toHaveLength(30);
    expect(preview.sheets[0].truncated).toBe(true);
    expect(preview.sheets[0].rows[0][0].value).toBe('<script>alert(1)</script>');
  });
});

describe('local upload responses', () => {
  it('removes only newly written upload files if the metadata write fails', async () => {
    const originalWrite = fs.writeFileSync.bind(fs);
    const write = vi.spyOn(fs, 'writeFileSync').mockImplementation((file, data, options) => {
      if (String(file).startsWith(root) && String(file).endsWith('.json'))
        throw new Error('metadata write failed');
      return originalWrite(file, data, options);
    });
    try {
      const pixels = await sharp({
        create: { width: 4, height: 4, channels: 3, background: '#123456' },
      })
        .png()
        .toBuffer();
      await expect(
        storeCoverImage(pixels, 'cover.png', { x: 0.5, y: 0.5, zoom: 1 }, root),
      ).rejects.toThrow('metadata write failed');
      expect(fs.readdirSync(path.join(root, 'images'))).toEqual([]);
      await expect(storeWorkbook(buffer(), 'model.xlsx', root)).rejects.toThrow(
        'metadata write failed',
      );
      expect(fs.readdirSync(path.join(root, 'workbooks'))).toEqual([]);
    } finally {
      write.mockRestore();
    }
  });
  it('shows input errors but hides filesystem failures in image and workbook uploads', async () => {
    const priorAdmin = process.env.PORTFOLIO_ADMIN;
    const priorFile = process.env.PORTFOLIO_AUTH_FILE;
    const priorRoot = process.env.PORTFOLIO_CONTENT_DIR;
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.PORTFOLIO_ADMIN = '1';
    process.env.PORTFOLIO_AUTH_FILE = path.join(root, 'auth.json');
    initializeAdmins([testAdminFixture.accounts[0], testAdminFixture.accounts[1]]);
    const token = logIn(testAdminFixture.accounts[0].email, testAdminFixture.accounts[0].password)!;
    const blockedRoot = path.join(root, 'not-a-directory');
    writeFileSync(blockedRoot, 'file');
    process.env.PORTFOLIO_CONTENT_DIR = blockedRoot;
    const request = (file: File, crop?: string) => {
      const body = new FormData();
      body.set('file', file);
      if (crop !== undefined) body.set('crop', crop);
      return new Request('http://127.0.0.1:3000/admin/api/upload/', {
        method: 'POST',
        headers: {
          host: '127.0.0.1:3000',
          origin: 'http://127.0.0.1:3000',
          'x-portfolio-admin': '1',
          cookie: `portfolio_admin_session=${token}`,
        },
        body,
      });
    };
    try {
      const pixels = await sharp({
        create: { width: 4, height: 4, channels: 3, background: '#123456' },
      })
        .png()
        .toBuffer();
      const image = new File([new Uint8Array(pixels)], 'cover.png', { type: 'image/png' });
      const invalidCrop = await uploadImage(request(image, '{'));
      expect(invalidCrop.status).toBe(400);
      expect((await invalidCrop.json()).message).toContain('valid image crop');
      const tinyPixels = await sharp({
        create: { width: 1, height: 1, channels: 3, background: '#123456' },
      })
        .png()
        .toBuffer();
      const tinyImage = new File([new Uint8Array(tinyPixels)], 'tiny.png', { type: 'image/png' });
      const tinyFailure = await uploadImage(
        request(tinyImage, JSON.stringify({ x: 0.5, y: 0.5, zoom: 1 })),
      );
      expect(tinyFailure.status).toBe(400);
      expect((await tinyFailure.json()).message).toContain('at least 2 pixels');
      const imageFailure = await uploadImage(
        request(image, JSON.stringify({ x: 0.5, y: 0.5, zoom: 1 })),
      );
      expect(imageFailure.status).toBe(500);
      expect(JSON.stringify(await imageFailure.json())).not.toContain(blockedRoot);
      const workbook = new File([new Uint8Array(buffer())], 'model.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const workbookFailure = await uploadWorkbook(request(workbook));
      expect(workbookFailure.status).toBe(500);
      expect(JSON.stringify(await workbookFailure.json())).not.toContain(blockedRoot);
    } finally {
      if (priorAdmin === undefined) delete process.env.PORTFOLIO_ADMIN;
      else process.env.PORTFOLIO_ADMIN = priorAdmin;
      if (priorFile === undefined) delete process.env.PORTFOLIO_AUTH_FILE;
      else process.env.PORTFOLIO_AUTH_FILE = priorFile;
      if (priorRoot === undefined) delete process.env.PORTFOLIO_CONTENT_DIR;
      else process.env.PORTFOLIO_CONTENT_DIR = priorRoot;
      errorLog.mockRestore();
    }
  });
});
