// Serves only résumé and certification PDFs currently approved in the public profile.
import { loadPublicContent } from '@/lib/content';
import { downloadPrivate } from '@/lib/supabase/storage';
import { runtimeSetting } from '@/lib/runtime-env';

type Context = { params: Promise<{ kind: string; id: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function GET(_request: Request, { params }: Context) {
  if (runtimeSetting('PORTFOLIO_DATA_SOURCE') !== 'supabase')
    return new Response('Not found', { status: 404 });
  const { kind, id } = await params;
  if (!uuid.test(id) || !['resume', 'certification'].includes(kind))
    return new Response('Not found', { status: 404 });
  const profile = (await loadPublicContent()).profile;
  const path =
    kind === 'resume' ? `/downloads/resumes/${id}.pdf` : `/downloads/certifications/${id}.pdf`;
  const visible =
    kind === 'resume'
      ? profile.resumeVisible && profile.resume === path
      : profile.certifications.some((item) => item.visible && item.pdf === path);
  if (!visible) return new Response('Not found', { status: 404 });
  const bytes = await downloadPrivate(
    `${kind === 'resume' ? 'resumes' : 'certifications'}/${id}.pdf`,
  );
  if (!bytes) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${kind}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
