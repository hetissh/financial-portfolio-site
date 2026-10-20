// Verifies cloud uploads persist normalized bytes directly without local file processing.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { storeCloudImage, storeCloudWorkbook } from '../../src/lib/supabase/uploads';
import { parseWorkbookInProcess } from '../../src/lib/workbook-parser.mjs';

const storage = vi.hoisted(() => ({ uploadPrivate: vi.fn(), removePrivate: vi.fn() }));
vi.mock('../../src/lib/supabase/storage', () => storage);

beforeEach(() => {
  storage.uploadPrivate.mockReset().mockResolvedValue(undefined);
  storage.removePrivate.mockReset().mockResolvedValue(undefined);
});

describe('Cloud upload processing', () => {
  it('stores browser-normalized WebP data without a local image processor', async () => {
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    const result = await storeCloudImage(
      webp,
      webp,
      'cover.png',
      { x: 0.5, y: 0.5, zoom: 1 },
      'cover',
      1.55,
      { width: 1200, height: 774 },
    );
    expect(result).toMatchObject({ crop: { x: 0.5, y: 0.5, zoom: 1 } });
    expect(storage.uploadPrivate).toHaveBeenCalledTimes(3);
    expect(storage.uploadPrivate.mock.calls.map(([key]) => key)).toEqual([
      `images/${result.id}.original.webp`,
      `images/${result.id}.webp`,
      `images/${result.id}.json`,
    ]);
  });

  it('validates the archive and stores a bounded browser-generated workbook preview', async () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Revenue'], [120]]), 'Summary');
    const bytes = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
    const preview = parseWorkbookInProcess(new Uint8Array(bytes));
    const result = await storeCloudWorkbook(Buffer.from(bytes), 'Model.xlsx', preview);
    expect(result.preview).toEqual(preview);
    expect(storage.uploadPrivate).toHaveBeenCalledTimes(2);
    expect(storage.uploadPrivate.mock.calls[0]?.[0]).toBe(`workbooks/${result.attachment.id}.xlsx`);
  });

  it('cleans up partial Storage writes when a later object upload fails', async () => {
    storage.uploadPrivate
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('failed'));
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    await expect(
      storeCloudImage(webp, webp, 'cover.png', { x: 0.5, y: 0.5, zoom: 1 }, 'cover', 1.55, {
        width: 1200,
        height: 774,
      }),
    ).rejects.toThrow();
    expect(storage.removePrivate).toHaveBeenCalledTimes(1);
    expect(storage.removePrivate.mock.calls[0]?.[0]).toHaveLength(1);
  });
});
