import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadContent } from "@/lib/content";
import { ResearchArticle } from "@/components/ResearchArticle";
export function generateStaticParams() { return loadContent().research.map((item) => ({ slug: item.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const note = loadContent().research.find((item) => item.slug === slug);
  if (!note) return { title: "Note not found" };
  return { title: note.title, description: note.summary, alternates: process.env.SITE_URL ? { canonical: `/research/${slug}/` } : undefined, openGraph: { title: note.title, description: note.summary, type: "article", publishedTime: note.publishedAt, images: [{ url: "/social.png", width: 1200, height: 630 }] } };
}
export default async function ResearchDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { research } = loadContent();
  const note = research.find((item) => item.slug === slug);
  if (!note) notFound();
  const next = research[(research.findIndex((item) => item.id === note.id) + 1) % research.length];
  return <ResearchArticle note={note} number={research.findIndex(item => item.id === note.id) + 1} next={research.length > 1 ? next : undefined} back={{ href: "/research/", label: "All research" }} />;
}
