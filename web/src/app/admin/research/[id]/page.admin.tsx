// Loads an existing note into the local research editor.
import { automaticNoteNumber } from '@/lib/research-order';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { adminContent } from '@/lib/admin/data-source';
import { requireAdminPage } from '@/lib/admin/auth';
import { ResearchEditor } from '@/components/admin/ResearchEditor';
import styles from '@/components/admin/admin.module.css';

type Props = { params: Promise<{ id: string }> };
const findNote = async ({ params }: Props) => {
  await requireAdminPage();
  const { id } = await params;
  return (await adminContent()).research.find((item) => item.id === id);
};
export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: (await findNote(props))?.title ?? 'Note not found' };
}
export default async function EditResearch(props: Props) {
  const note = await findNote(props);
  if (!note) notFound();
  const { file, version, ...record } = note;
  return (
    <main className={`wrap ${styles.page}`} id="main">
      <header className={styles.pageHead}>
        <div>
          <Link className={`text-link ${styles.backLink}`} href="/admin/">
            <ArrowLeft size={16} aria-hidden="true" /> Overview
          </Link>
          <span className="eyebrow">EDITING · {record.id}</span>
          <h1 id="top" tabIndex={-1}>
            {record.title}
            <span className="green-period">.</span>
          </h1>
        </div>
        <div>
          <p>
            Saved as <code className={styles.code}>{file}</code>. Saving validates the note before
            it becomes part of the portfolio.
          </p>
        </div>
      </header>
      <ResearchEditor
        key={record.id}
        record={record}
        number={automaticNoteNumber((await adminContent()).research, record.id)}
        file={file}
        version={version}
      />
    </main>
  );
}
