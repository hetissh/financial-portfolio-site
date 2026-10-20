// Inspects bounded ZIP metadata without decompressing untrusted workbook entries.
const viewOf = (bytes) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const u16 = (view, offset) => view.getUint16(offset, true);
const u32 = (view, offset) => view.getUint32(offset, true);

export function validateWorkbookArchive(bytes) {
  const view = viewOf(bytes);
  if (bytes.length < 22 || u32(view, 0) !== 0x04034b50)
    throw new Error('Upload a valid .xlsx workbook.');
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (u32(view, i) === 0x06054b50 && i + 22 + u16(view, i + 20) === bytes.length) {
      end = i;
      break;
    }
  }
  if (end < 0 || u16(view, end + 4) !== 0 || u16(view, end + 6) !== 0)
    throw new Error('This archive format is not supported.');
  const count = u16(view, end + 10);
  let at = u32(view, end + 16);
  let total = 0;
  if (count > 3000 || at + u32(view, end + 12) !== end)
    throw new Error('Workbook archive is too complex.');
  const names = new Set();
  const decoder = new TextDecoder();
  for (let entry = 0; entry < count; entry++) {
    if (at + 46 > end || u32(view, at) !== 0x02014b50)
      throw new Error('Workbook archive is damaged.');
    const flags = u16(view, at + 8),
      method = u16(view, at + 10);
    const compressed = u32(view, at + 20),
      size = u32(view, at + 24);
    const nameLength = u16(view, at + 28),
      extra = u16(view, at + 30),
      comment = u16(view, at + 32);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    const local = u32(view, at + 42);
    total += size;
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      size > 16 * 1024 * 1024 ||
      total > 25 * 1024 * 1024 ||
      size > Math.max(1, compressed) * 300 ||
      local + 30 > at ||
      u32(view, local) !== 0x04034b50 ||
      names.has(name)
    )
      throw new Error('Workbook is encrypted, damaged, or too large to preview.');
    if (/vbaProject|externalLinks/i.test(name))
      throw new Error('Remove macros and external workbook links before uploading.');
    if (name.includes('..') || name.startsWith('/') || name.includes('\\'))
      throw new Error('Invalid workbook archive path.');
    names.add(name);
    at += 46 + nameLength + extra + comment;
  }
  if (at !== end || !names.has('[Content_Types].xml') || !names.has('xl/workbook.xml'))
    throw new Error('Upload an .xlsx workbook.');
}

export function workbookFilename(filename) {
  return filename.replace(/[^\w. ()-]/g, '_').slice(0, 150);
}
