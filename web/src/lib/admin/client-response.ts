// Validates local-admin upload responses before browser editors use their data.
import { z } from 'zod';
import { attachmentSchema, cropSchema } from '../content-schema';
import { articleImageId } from '../rich-content';
import { workbookPreviewSchema } from '../workbook-preview';
export { workbookPreviewSchema } from '../workbook-preview';

export const coverUploadSchema = z.object({ id: z.string().uuid(), crop: cropSchema });

export const articleUploadSchema = z
  .object({
    id: z.string().uuid(),
    src: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .refine((image) => articleImageId(image.src) === image.id);

export const workbookUploadSchema = z.object({
  attachment: attachmentSchema.refine((attachment) => attachment.kind === 'excel'),
  preview: workbookPreviewSchema,
});

export function responseMessage(value: unknown, fallback: string): string {
  const result = z.object({ message: z.string().min(1) }).safeParse(value);
  return result.success ? result.data.message : fallback;
}
