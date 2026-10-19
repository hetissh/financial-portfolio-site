// Loads the validated workbook preview stored alongside an uploaded Excel source.
import { z } from 'zod';
import { workbookPreviewSchema } from '@/lib/workbook-preview';
import { downloadPrivate } from './storage';

const metadataSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(150)
    .regex(/^[\w. ()-]+$/),
  preview: workbookPreviewSchema,
});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function getCloudWorkbook(id: string) {
  if (!uuid.test(id)) return null;
  const bytes = await downloadPrivate(`workbooks/${id}.json`);
  if (!bytes) return null;
  try {
    return metadataSchema.parse(JSON.parse(bytes.toString('utf8')));
  } catch {
    return null;
  }
}
