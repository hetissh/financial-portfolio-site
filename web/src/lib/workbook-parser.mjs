// Parses bounded .xlsx bytes in memory for Cloudflare Workers and the local worker wrapper.
import * as XLSX from 'xlsx';
import { validateWorkbookArchive } from './workbook-archive.mjs';
export { validateWorkbookArchive } from './workbook-archive.mjs';

export function parseWorkbookInProcess(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  validateWorkbookArchive(bytes);
  const book = XLSX.read(bytes, {
    type: 'array',
    sheetRows: 201,
    cellFormula: true,
    cellHTML: false,
    cellStyles: false,
    bookVBA: false,
    cellText: true,
  });
  const sheets = [];
  for (const [position, name] of book.SheetNames.entries()) {
    if (book.Workbook?.Sheets?.[position]?.Hidden) continue;
    if (sheets.length === 12) break;
    const sheet = book.Sheets[name];
    const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref'] || 'A1');
    const rowCount = range.e.r + 1,
      columnCount = range.e.c + 1,
      rows = [];
    for (let r = 0; r < Math.min(rowCount, 200); r++) {
      const cells = [];
      for (let c = 0; c < Math.min(columnCount, 30); c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        cells.push({
          value: String(cell?.w ?? cell?.v ?? '').slice(0, 2000),
          ...(cell?.f ? { formula: String(cell.f).slice(0, 2000) } : {}),
        });
      }
      rows.push(cells);
    }
    sheets.push({
      name,
      rows,
      rowCount,
      columnCount,
      truncated: rowCount > 200 || columnCount > 30,
    });
  }
  if (!sheets.length) throw new Error('This workbook has no visible sheets.');
  return {
    sheets,
    sheetsTruncated:
      book.SheetNames.filter((_, i) => !book.Workbook?.Sheets?.[i]?.Hidden).length > 12,
  };
}
