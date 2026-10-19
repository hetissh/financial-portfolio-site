// Validates Supabase rows before they enter the public portfolio renderer.
import {
  parseResearch,
  profileSchema,
  visibleResearch,
  type Profile,
  type Research,
} from '../content-schema';
import { researchOrderSchema } from '../research-order';

export type ProfileRow = { id: number; body: unknown; version: number };
export type ResearchRow = {
  id: string;
  slug: string;
  status: string;
  body: unknown;
  version: number;
};
export type OrderRow = { id: number; note_ids: unknown; version: number };

export function parsePublicPortfolio(
  profileRow: ProfileRow | null,
  researchRows: ResearchRow[],
  orderRow: OrderRow | null,
): { profile: Profile; research: Research[]; mode: 'production' } {
  if (!profileRow || profileRow.id !== 1) throw new Error('Public profile is unavailable.');
  const profile = profileSchema.parse(profileRow.body);
  if (profile.isPlaceholder) throw new Error('Public profile is not approved.');
  const records = parseResearch(researchRows.map((row) => row.body));
  for (const row of researchRows) {
    const record = records.find((entry) => entry.id === row.id);
    if (!record || record.slug !== row.slug || record.status !== row.status)
      throw new Error('A research record does not match its Supabase row.');
  }
  const order = orderRow ? researchOrderSchema.parse({ ids: orderRow.note_ids }).ids : [];
  return { profile, research: visibleResearch(records, 'production', order), mode: 'production' };
}
