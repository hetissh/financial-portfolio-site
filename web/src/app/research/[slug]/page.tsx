// Exports one visible research article at its stable slug route.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadContent, loadPublicContent } from '@/lib/content';
import { ResearchArticle } from '@/components/ResearchArticle';
import { runtimeSetting } from '@/lib/runtime-env';
export function generateStaticParams() {
  if (runtimeSetting('PORTFOLIO_DATA_SOURCE') === 'supabase') return [];
  const research = loadContent().research;
  // Static export requires one generated param for a dynamic route; this sentinel builds a 404 when the collection is empty.
  return research.length > 0
    ? research.map((item) => ({ slug: item.slug }))
    : [{ slug: '__empty' }];
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = (await loadPublicContent()).research.find((item) => item.slug === slug);
  if (!note) return { title: 'Note not found' };
  return {
    title: note.title,
    description: note.summary,
    alternates: runtimeSetting('SITE_URL') ? { canonical: `/research/${slug}/` } : undefined,
    openGraph: {
      title: note.title,
      description: note.summary,
      type: 'article',
      publishedTime: note.publishedAt,
      images: [{ url: '/social.png', width: 1200, height: 630 }],
    },
  };
}
export default async function ResearchDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === '__empty') notFound();
  const { research } = await loadPublicContent();
  const note = research.find((item) => item.slug === slug);
  if (!note) notFound();
  const next = research[(research.findIndex((item) => item.id === note.id) + 1) % research.length];
  return (
    <ResearchArticle
      note={note}
      number={research.findIndex((item) => item.id === note.id) + 1}
      next={research.length > 1 ? next : undefined}
      back={{ href: '/research/', label: 'All research' }}
    />
  );
}
