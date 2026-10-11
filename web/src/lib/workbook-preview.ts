// Shares the bounded workbook-preview contract across the worker, server, and browser.
import { z } from 'zod';

export const workbookPreviewSchema = z.object({
  sheets: z
    .array(
      z.object({
        name: z.string().max(255),
        rows: z
          .array(
            z
              .array(
                z.object({ value: z.string().max(2000), formula: z.string().max(2000).optional() }),
              )
              .max(30),
          )
          .max(200),
        rowCount: z.number().int().nonnegative().max(1_048_576),
        columnCount: z.number().int().nonnegative().max(16_384),
        truncated: z.boolean(),
      }),
    )
    .min(1)
    .max(12),
  sheetsTruncated: z.boolean(),
});

export type WorkbookPreview = z.infer<typeof workbookPreviewSchema>;
