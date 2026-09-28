import { z } from 'zod';
import type { Research } from './content-schema';

export const researchOrderSchema = z.object({ ids: z.array(z.string().trim().min(1)).max(10000) }).strict()
  .refine(order => new Set(order.ids).size === order.ids.length, { path: ['ids'], message: 'Each note must appear exactly once.' });

export function noteNumber(note: Pick<Research, 'noteNumber'>, automatic: number) {
  const custom = note.noteNumber;
  return String(custom !== undefined && Number.isInteger(custom) && custom >= 1 && custom <= 9999 ? custom : Math.max(1, automatic)).padStart(2, '0');
}
/** Drafts do not consume numbers on the public notebook. Include the current draft for its preview. */
export function automaticNoteNumber(records: Pick<Research, 'id' | 'status'>[], id: string) {
  return Math.max(1, records.filter(note => note.status !== 'draft' || note.id === id).findIndex(note => note.id === id) + 1);
}
