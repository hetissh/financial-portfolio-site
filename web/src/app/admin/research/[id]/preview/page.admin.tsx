import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readAdminContent } from "@/lib/admin/store";
import { ResearchArticle } from "@/components/ResearchArticle";
import styles from "@/components/admin/admin.module.css";

type Props = { params: Promise<{ id: string }> };
const findNote = async ({ params }: Props) => {
  const { id } = await params;
  return readAdminContent().research.find((item) => item.id === id);
};
export async function generateMetadata(props: Props): Promise<Metadata> {
  const note = await findNote(props);
  return { title: note ? `Preview: ${note.title}` : "Note not found" };
}
const visibility = { draft: "Draft — not shown anywhere on the site.", sample: "Example — shown in preview builds only.", published: "Published — shown in preview and production." };
export default async function PreviewResearch(props: Props) {
  const note = await findNote(props);
  if (!note) notFound();
  const editHref = `/admin/research/${encodeURIComponent(note.id)}/`;
  return <ResearchArticle note={note} back={{ href: editHref, label: "Back to editor" }} notice={<p className={styles.notice} role="note"><span><strong>Preview of the saved version.</strong> {visibility[note.status]}</span>{note.status !== "draft" && <Link href={`/research/${note.slug}/`}>Open public page</Link>}</p>} />;
}
