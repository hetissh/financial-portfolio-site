'use client';
import { useState } from 'react';
import type { WorkbookPreview } from '@/lib/admin/workbooks';
export function WorkbookViewer({ preview, label }: { preview: WorkbookPreview; label: string }) {
  const [selected, setSelected] = useState(0);
  const [formulas, setFormulas] = useState(false);
  const sheet = preview.sheets[selected];
  const letter = (index: number) => index < 26 ? String.fromCharCode(65 + index) : `A${String.fromCharCode(65 + index - 26)}`;
  return <div className="workbook-viewer">
    <div className="sheet-toolbar"><label>Sheet<select aria-label="Sheet" value={selected} onChange={e => setSelected(Number(e.target.value))}>{preview.sheets.map((s, i) => <option value={i} key={s.name}>{s.name}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={formulas} onChange={e => setFormulas(e.target.checked)} /> Show formulas</label></div>
    <div className="sheet-scroll" tabIndex={0} role="region" aria-label={`${label}: ${sheet.name}. Scroll to explore the sheet.`}><table className="sheet-table"><caption>{sheet.name}</caption><thead><tr><th scope="col" aria-label="Row number">#</th>{sheet.rows[0]?.map((_, i) => <th key={i} scope="col">{letter(i)}</th>)}</tr></thead><tbody>{sheet.rows.map((row, r) => <tr key={r}><th scope="row">{r + 1}</th>{row.map((cell, c) => <td key={c} title={cell.formula ? `Formula: =${cell.formula}` : undefined} className={cell.formula ? 'formula-cell' : undefined}>{formulas && cell.formula ? `=${cell.formula}` : cell.value || (cell.formula ? '—' : '')}</td>)}</tr>)}</tbody></table></div>
    <p className="sheet-footnote">Read-only preview · {sheet.rowCount} rows × {sheet.columnCount} columns. Values reflect the last Excel save; formulas do not recalculate here.{sheet.truncated && ' Preview limited to 200 rows and 30 columns; download for the full sheet.'}{preview.sheetsTruncated && ' First 12 visible sheets shown.'}</p>
  </div>;
}
