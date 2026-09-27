import * as XLSX from 'xlsx';
import { readAdminContent, updateResearch } from '../src/lib/admin/store';
import { storeWorkbook } from '../src/lib/admin/workbooks';
const note = readAdminContent().research.find(n => n.slug === 'beyond-the-bottom-line' && n.status === 'sample');
if (!note || note.attachments.length) { console.log('Existing content kept: no empty example note to attach a demo workbook.'); }
else {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['ILLUSTRATIVE EXAMPLE — NOT A REAL COMPANY'],
    ['Fictional units. This workbook demonstrates the sheet viewer.'],
    [], ['Metric', 'Year 1', 'Year 2', 'Notes'],
    ['Revenue', 100, 120, 'Illustrative inputs'], ['Operating costs', 75, 87, 'Illustrative inputs'],
    ['Operating profit', 25, 33, 'Revenue less operating costs'],
    ['Operating margin', 0.25, 0.275, 'Operating profit / revenue'],
    [], ['Not investment research or forecasts. Replace with your own work.'],
  ]);
  sheet.B7 = { t: 'n', v: 25, f: 'B5-B6' }; sheet.C7 = { t: 'n', v: 33, f: 'C5-C6' };
  sheet.B8 = { t: 'n', v: 0.25, f: 'B7/B5', z: '0.0%' }; sheet.C8 = { t: 'n', v: 0.275, f: 'C7/C5', z: '0.0%' };
  XLSX.utils.book_append_sheet(book, sheet, 'Example statements');
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ['Research question', 'Evidence to collect'], ['What does the business sell?', 'Product disclosures'],
    ['How does revenue become cash?', 'Cash-flow and working capital notes'], ['What could change the outcome?', 'Assumptions and risks'],
    [], ['Example only. Replace this workbook with your own research.'],
  ]), 'Research questions');
  const { attachment } = await storeWorkbook(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }), 'Example financial statements.xlsx');
  updateResearch(note.id, { ...note, attachments: [attachment] }, { expectedVersion: note.version });
  console.log('Attached a clearly labelled example workbook to Beyond the bottom line.');
}
