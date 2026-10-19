// Reads live visitor content through Supabase RLS without exposing the secret key.
import { publicSupabase } from './client';
import { parsePublicPortfolio, type ResearchRow } from './portfolio';

export async function readPublicPortfolio() {
  const client = publicSupabase();
  const [profile, order] = await Promise.all([
    client.from('portfolio_profile').select('id,body,version').eq('id', 1).maybeSingle(),
    client.rpc('portfolio_public_order'),
  ]);
  if (profile.error || order.error) throw new Error('Unable to load public portfolio content.');

  // PostgREST limits result windows; continue until every published note is read.
  const research: ResearchRow[] = [];
  for (let offset = 0; ; offset += 250) {
    const page = await client
      .from('portfolio_research')
      .select('id,slug,status,body,version')
      .eq('status', 'published')
      .order('id')
      .range(offset, offset + 249);
    if (page.error || !page.data) throw new Error('Unable to load public research.');
    research.push(...page.data);
    if (page.data.length < 250) break;
  }
  return parsePublicPortfolio(profile.data, research, { id: 1, note_ids: order.data, version: 1 });
}
