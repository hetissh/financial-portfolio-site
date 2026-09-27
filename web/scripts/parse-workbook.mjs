import { parentPort, workerData } from 'node:worker_threads';
import * as XLSX from 'xlsx';

// Accept only bounded, ordinary OOXML archives, before decompression.
export function validateArchive(buffer) {
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) throw new Error('Upload a valid .xlsx workbook.');
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50 && i + 22 + buffer.readUInt16LE(i + 20) === buffer.length) { end = i; break; }
  }
  if (end < 0 || buffer.readUInt16LE(end + 4) !== 0 || buffer.readUInt16LE(end + 6) !== 0) throw new Error('This archive format is not supported.');
  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16), total = 0;
  if (count > 3000 || at + buffer.readUInt32LE(end + 12) !== end) throw new Error('Workbook archive is too complex.');
  const names = new Set();
  for (let entry = 0; entry < count; entry++) {
    if (at + 46 > end || buffer.readUInt32LE(at) !== 0x02014b50) throw new Error('Workbook archive is damaged.');
    const flags = buffer.readUInt16LE(at + 8), method = buffer.readUInt16LE(at + 10);
    const compressed = buffer.readUInt32LE(at + 20), size = buffer.readUInt32LE(at + 24);
    const nameLength = buffer.readUInt16LE(at + 28), extra = buffer.readUInt16LE(at + 30), comment = buffer.readUInt16LE(at + 32);
    const name = buffer.toString('utf8', at + 46, at + 46 + nameLength);
    const local = buffer.readUInt32LE(at + 42);
    total += size;
    if ((flags & 1) || ![0, 8].includes(method) || size > 16 * 1024 * 1024 || total > 25 * 1024 * 1024 || size > Math.max(1, compressed) * 300 || local + 30 > at || buffer.readUInt32LE(local) !== 0x04034b50 || names.has(name)) throw new Error('Workbook is encrypted, damaged, or too large to preview.');
    if (/vbaProject|externalLinks/i.test(name)) throw new Error('Remove macros and external workbook links before uploading.');
    if (name.includes('..') || name.startsWith('/') || name.includes('\\')) throw new Error('Invalid workbook archive path.');
    names.add(name);
    at += 46 + nameLength + extra + comment;
  }
  if (at !== end || !names.has('[Content_Types].xml') || !names.has('xl/workbook.xml')) throw new Error('Upload an .xlsx workbook.');
}
export function parseWorkbook(bytes) {
  const buffer = Buffer.from(bytes);
  validateArchive(buffer);
  const book = XLSX.read(buffer, { type: 'buffer', sheetRows: 201, cellFormula: true, cellHTML: false, cellStyles: false, bookVBA: false, cellText: true });
  const sheets = [];
  for (const name of book.SheetNames) {
    const position = book.SheetNames.indexOf(name);
    if (book.Workbook?.Sheets?.[position]?.Hidden) continue;
    if (sheets.length === 12) break;
    const sheet = book.Sheets[name];
    const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref'] || 'A1');
    const rowCount = range.e.r + 1, columnCount = range.e.c + 1;
    const rows = [];
    for (let r = 0; r < Math.min(rowCount, 200); r++) {
      const cells = [];
      for (let c = 0; c < Math.min(columnCount, 30); c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        cells.push({ value: String(cell?.w ?? cell?.v ?? '').slice(0, 2000), ...(cell?.f ? { formula: String(cell.f).slice(0, 2000) } : {}) });
      }
      rows.push(cells);
    }
    sheets.push({ name, rows, rowCount, columnCount, truncated: rowCount > 200 || columnCount > 30 });
  }
  if (!sheets.length) throw new Error('This workbook has no visible sheets.');
  return { sheets, sheetsTruncated: book.SheetNames.filter((_, i) => !book.Workbook?.Sheets?.[i]?.Hidden).length > 12 };
}
if (parentPort) {
  try { parentPort.postMessage({ preview: parseWorkbook(workerData.bytes) }); }
  catch (error) { parentPort.postMessage({ error: error instanceof Error ? error.message : 'Cannot read this workbook.' }); }
}
