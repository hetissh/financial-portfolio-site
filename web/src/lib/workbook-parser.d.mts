// Describes the bounded workbook parser used by both Node and Workers.
import type { WorkbookPreview } from './workbook-preview';
export function parseWorkbookInProcess(input: Uint8Array): WorkbookPreview;
