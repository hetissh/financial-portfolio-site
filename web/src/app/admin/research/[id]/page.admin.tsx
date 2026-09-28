import { automaticNoteNumber } from "@/lib/research-order";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { readAdminContent } from "@/lib/admin/store";
import { ResearchEditor } from "@/components/admin/ResearchEditor";
import styles from "@/components/admin/admin.module.css";

type Props = { params: Promise<{ id: string }> };
const findNote = async ({ params }: Props) => {
  const { id } = await params;
  return readAdminContent().research.find((item) => item.id === id);
};
export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: (await findNote(props))?.title ?? "Note not found" };
}
export default async function EditResearch(props: Props) {
  const note = await findNote(props);
  if (!note) notFound();
  const { file, version, ...record } = note;
  return <main className={`wrap ${styles.page}`} id="main">
    <header className={styles.pageHead}>
      <div><Link className={`text-link ${styles.backLink}`} href="/admin/"><ArrowLeft size={16} aria-hidden="true" /> Overview</Link><span className="eyebrow">EDITING · {record.id}</span><h1 id="top" tabIndex={-1}>{record.title}<span className="green-period">.</span></h1></div>
      <div><p>Saved as <code className={styles.code}>src/content/research/{file}</code>. Saving checks the whole collection, so a broken note cannot reach the build.</p></div>
    </header>
    <ResearchEditor key={record.id} record={record} number={automaticNoteNumber(readAdminContent().research, record.id)} file={file} version={version} />
  </main>;
}
