// Validates the bounded PDF format shared by local and cloud upload paths.
import { UploadInputError } from './upload-errors';

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export function validatePdf(buffer: Uint8Array, filename: string, label = 'PDF') {
  const bytes = new Uint8Array(buffer);
  const header = new TextDecoder().decode(bytes.subarray(0, 5));
  const tail = new TextDecoder().decode(bytes.subarray(Math.max(0, bytes.length - 2048)));
  if (
    !/\.pdf$/i.test(filename) ||
    bytes.length < 8 ||
    bytes.length > MAX_RESUME_BYTES ||
    header !== '%PDF-' ||
    !tail.includes('%%EOF')
  )
    throw new UploadInputError(`Choose a valid ${label} up to 5 MB.`);
}
