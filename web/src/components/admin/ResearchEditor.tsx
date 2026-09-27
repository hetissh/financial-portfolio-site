"use client";
import { RichTextEditor } from "./RichTextEditor";
import { paragraphsToDocument } from "@/lib/rich-content";
import { ArtworkEditor } from "./ArtworkEditor";
import { SheetEditor } from "./SheetEditor";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, Plus, Trash2, X } from "lucide-react";
import { researchStatuses, wordCoverSchema, type Research } from "@/lib/content-schema";
import { draftToResearch, splitParagraphs, emptySection, emptySource, groupIssues, researchToDraft, slugify, type ContentIssue, type ResearchDraft, type SectionDraft } from "@/lib/admin/form";
import { proceduralMotif } from "@/lib/procedural-cover";
import { ResearchCard } from "@/components/ResearchCard";
import { ErrorSummary, Field, SaveStatus, sendJson, useEditorState, type SaveState } from "./fields";
import styles from "./admin.module.css";

const statusCopy: Record<Research["status"], { label: string; detail: string }> = {
  draft: { label: "Draft", detail: "Hidden everywhere. Only visible here." },
  sample: { label: "Example", detail: "Shown in preview builds with example labels; excluded from production." },
  published: { label: "Published", detail: "Shown in preview and production. Sources are optional." },
};

export function ResearchEditor({ record, file, version }: { record?: Research; file?: string; version?: string }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const { draft, setDraft, update, dirty, markSaved, reset, ready } = useEditorState<ResearchDraft>(researchToDraft(record), draftToResearch, formRef);
  const [uploading, setUploading] = useState(false);
  const [writingReset, setWritingReset] = useState(0);
  const [currentVersion, setVersion] = useState(version);
  const [slugEdited, setSlugEdited] = useState(Boolean(record));
  const [issues, setIssues] = useState<ContentIssue[]>([]);
  const [failure, setFailure] = useState<string>();
  const [coverError, setCoverError] = useState<string>();
  const [state, setState] = useState<SaveState>({ tone: "idle", text: record ? `Saved in src/content/research/${file}` : "Not saved yet" });
  const grouped = groupIssues(issues);
  const isNew = !record;

  const updateSection = (index: number, patch: Partial<SectionDraft>) => setDraft((current) => ({ ...current, sections: current.sections.map((section, i) => i === index ? { ...section, ...patch } : section) }));
  const moveSection = (index: number, offset: number) => setDraft((current) => {
    const sections = [...current.sections];
    [sections[index], sections[index + offset]] = [sections[index + offset], sections[index]];
    return { ...current, sections };
  });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (state.tone === "saving" || refreshing || uploading) return;
    setState({ tone: "saving", text: "Saving…" });
    const { ok, payload } = await sendJson(isNew ? "/admin/api/research/" : `/admin/api/research/${encodeURIComponent(draft.id)}/`, isNew ? "POST" : "PUT", draftToResearch(draft), currentVersion);
    setIssues(payload.issues ?? []);
    setFailure(ok || payload.issues ? undefined : payload.message);
    if (!ok) { setState({ tone: "error", text: payload.message ?? "Could not save." }); return; }
    const saved = payload.record as Research & { file: string; version: string };
    const next = { ...draft, id: saved.id, slug: saved.slug, cover: saved.cover, coverWord: saved.cover?.word ?? draft.coverWord, coverColor: saved.cover?.color ?? draft.coverColor };
    setVersion(saved.version);
    setDraft(next);
    markSaved(next);
    setState({ tone: "ok", text: `Saved to src/content/research/${saved.file}` });
    startRefresh(() => { if (isNew) router.replace(`/admin/research/${encodeURIComponent(saved.id)}/`); else router.refresh(); });
  }

  async function remove() {
    if (!record || !window.confirm(`Move “${record.title}” to the admin trash? It will be removed from the site. The file is kept in web/.admin-trash/.`)) return;
    setState({ tone: "saving", text: "Removing…" });
    const { ok, payload } = await sendJson(`/admin/api/research/${encodeURIComponent(record.id)}/`, "DELETE", undefined, currentVersion);
    if (!ok) { setState({ tone: "error", text: payload.message ?? "Could not remove the note." }); return; }
    markSaved(draft);
    router.push("/admin/");
    router.refresh();
  }

  function generateCover() {
    const sameWord = draft.cover?.word === draft.coverWord.trim();
    const variation = sameWord ? ((draft.cover?.variation ?? 0) + 1) % 1000 : 0;
    const result = wordCoverSchema.safeParse({ word: draft.coverWord, color: draft.coverColor, variation, seed: crypto.randomUUID(), generatorVersion: 1 });
    if (!result.success) { setCoverError(result.error.issues[0].message); return; }
    // Avoid an immediate repeat of the main shape family, as well as its geometry.
    const previous = draft.cover?.seed ? proceduralMotif(draft.cover.word, draft.cover.seed) : undefined;
    for (let attempts = 0; attempts < 16 && proceduralMotif(result.data.word, result.data.seed!) === previous; attempts++) result.data.seed = crypto.randomUUID();
    setCoverError(undefined);
    setDraft(current => ({ ...current, cover: result.data, coverWord: result.data.word, coverColor: result.data.color }));
  }

  const preview = { ...draftToResearch(draft), title: draft.title || "Untitled note", summary: draft.summary || "A one-sentence summary appears here.", category: draft.category || "Category", slug: draft.slug || "untitled" } as Research;

  return <form ref={formRef} onSubmit={save} autoComplete="off" noValidate>
    <ErrorSummary issues={issues} message={failure} />
    <fieldset className={styles.editorLock} disabled={!ready || state.tone === "saving" || refreshing || uploading}><legend className={styles.srOnly}>Research editor</legend>
    <nav className={styles.editorJumps} aria-label="Editor sections"><a href="#editor-note">Details</a><a href="#editor-cover">Cover</a><a href="#editor-sections">Writing</a><a href="#editor-sheets">Sheets &amp; models</a><a href="#editor-sources">Sources</a></nav>
    <div className={styles.editorGrid}>
      <div>
        <fieldset className={styles.fieldset} id="editor-note">
          <legend className={styles.legend}>The note</legend>
          <p className={styles.intro}>What readers see on cards and at the top of the article.</p>
          <Field field="title" label="Title" issues={grouped}>{(props) => <input {...props} className={styles.input} value={draft.title} onChange={(event) => { const title = event.target.value; setDraft((current) => ({ ...current, title, slug: slugEdited ? current.slug : slugify(title) })); }} />}</Field>
          <Field field="slug" label="URL slug" issues={grouped} hint={!isNew && draft.slug !== record.slug ? "Changing the slug changes the public URL and renames the file." : isNew && !slugEdited ? "Generated from the title until you edit it." : undefined}>
            {(props) => <div className={styles.slugInput}><span className={styles.slugPrefix} aria-hidden="true">/research/</span><input {...props} className={styles.input} value={draft.slug} spellCheck={false} autoCapitalize="none" onChange={(event) => { setSlugEdited(true); update("slug", event.target.value); }} /></div>}
          </Field>
          <Field field="summary" label="Summary" hint="One or two sentences for cards and search results." issues={grouped}>{(props) => <textarea {...props} className={styles.input} rows={3} value={draft.summary} onChange={(event) => update("summary", event.target.value)} />}</Field>
          <div className={styles.row2}>
            <Field field="category" label="Category" issues={grouped}>{(props) => <input {...props} className={styles.input} value={draft.category} onChange={(event) => update("category", event.target.value)} />}</Field>
            <Field field="tags" label="Tags" optional hint="Separate with commas." issues={grouped}>{(props) => <input {...props} className={styles.input} value={draft.tags} onChange={(event) => update("tags", event.target.value)} />}</Field>
          </div>
          <Field field="question" label="Guiding question" hint="Displayed as the opening pull quote." issues={grouped}>{(props) => <input {...props} className={styles.input} value={draft.question} onChange={(event) => update("question", event.target.value)} />}</Field>
        </fieldset>

        <ArtworkEditor draft={draft} setDraft={setDraft} issues={grouped} onBusy={setUploading} generate={generateCover} error={coverError} onEdited={() => setCoverError(undefined)} />

        <fieldset className={styles.fieldset} id="editor-sections">
          <legend className={styles.legend}>Sections</legend>
          <p className={styles.intro}>Each section appears in the article’s table of contents. Use the writing toolbar for formatting, subheadings and lists. Select words before making them bold or italic.</p>
          {grouped.get("sections") && <p className={styles.error} id="field-sections">{grouped.get("sections")!.join(" ")}</p>}
          {draft.sections.map((section, index) => <div className={styles.card} key={section.key} role="group" aria-labelledby={`section-label-${index}`}>
            <div className={styles.cardHead}>
              <span className="small-label" id={`section-label-${index}`}>Section {String(index + 1).padStart(2, "0")}</span>
              <div className={styles.iconButtons}>
                <button type="button" className={styles.iconButton} onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label={`Move section ${index + 1} up`}><ArrowUp size={16} aria-hidden="true" /></button>
                <button type="button" className={styles.iconButton} onClick={() => moveSection(index, 1)} disabled={index === draft.sections.length - 1} aria-label={`Move section ${index + 1} down`}><ArrowDown size={16} aria-hidden="true" /></button>
                <button type="button" className={`${styles.iconButton} ${styles.danger}`} onClick={() => setDraft((current) => ({ ...current, sections: current.sections.filter((_, i) => i !== index) }))} disabled={draft.sections.length === 1} aria-label={`Remove section ${index + 1}`}><Trash2 size={16} aria-hidden="true" /></button>
              </div>
            </div>
            <Field field={`sections.${index}.heading`} label="Heading" issues={grouped}>{(props) => <input {...props} className={styles.input} value={section.heading} onChange={(event) => updateSection(index, { heading: event.target.value })} />}</Field>
            <Field field={`sections.${index}.paragraphs`} label="Paragraphs" issues={grouped}>{(props) => <RichTextEditor {...props} resetKey={writingReset} label="Paragraphs" value={section.body ?? paragraphsToDocument(splitParagraphs(section.paragraphs))} onChange={body => updateSection(index, { body })} onBusy={setUploading} disabled={!ready || uploading || state.tone === "saving" || refreshing} />}</Field>
            <Field field={`sections.${index}.prompts`} label="Reflection prompts" optional hint="One per line. Shown as a list after the paragraphs." issues={grouped}>{(props) => <textarea {...props} className={styles.input} rows={3} value={section.prompts} onChange={(event) => updateSection(index, { prompts: event.target.value })} />}</Field>
          </div>)}
          <button type="button" className={styles.addButton} onClick={() => update("sections", [...draft.sections, emptySection()])}><Plus size={15} aria-hidden="true" /> Add section</button>
        </fieldset>

        <SheetEditor attachments={draft.attachments} onChange={value => update("attachments", value)} onBusy={setUploading} />
        <fieldset className={styles.fieldset} id="editor-sources">
          <legend className={styles.legend}>Sources</legend>
          <p className={styles.intro}>Optional, including for published notes. Listed under “Further reading” when added. Use full https:// addresses.</p>
          {grouped.get("sources") && <p className={styles.error} id="field-sources">{grouped.get("sources")!.join(" ")}</p>}
          {draft.sources.map((source, index) => <div className={styles.linkRow} key={source.key} role="group" aria-label={`Source ${index + 1}`}>
            <Field field={`sources.${index}.title`} label={`Source ${index + 1} title`} issues={grouped}>{(props) => <input {...props} className={styles.input} value={source.title} onChange={(event) => update("sources", draft.sources.map((item, i) => i === index ? { ...item, title: event.target.value } : item))} />}</Field>
            <Field field={`sources.${index}.url`} label="URL" issues={grouped}>{(props) => <input {...props} className={styles.input} type="url" inputMode="url" placeholder="https://" value={source.url} onChange={(event) => update("sources", draft.sources.map((item, i) => i === index ? { ...item, url: event.target.value } : item))} />}</Field>
            <button type="button" className={`${styles.iconButton} ${styles.danger}`} onClick={() => update("sources", draft.sources.filter((_, i) => i !== index))} aria-label={`Remove source ${index + 1}`}><X size={16} aria-hidden="true" /></button>
          </div>)}
          <button type="button" className={styles.addButton} onClick={() => update("sources", [...draft.sources, emptySource()])}><Plus size={15} aria-hidden="true" /> Add source</button>
        </fieldset>
      </div>

      <aside className={styles.side} aria-label="Publishing">
        <div className={styles.panel}><fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Publishing</legend>
          <fieldset className={styles.group} id="field-status">
            <legend className={styles.label}>Status</legend>
            <div className={styles.choices}>{researchStatuses.map((status) => <label className={styles.choice} key={status}>
              <input type="radio" name="status" value={status} checked={draft.status === status} onChange={() => update("status", status)} />
              <span><strong>{statusCopy[status].label}</strong><small>{statusCopy[status].detail}</small></span>
            </label>)}</div>
          </fieldset>
          <div className={styles.row2}>
            <Field field="publishedAt" label="Published" issues={grouped}>{(props) => <input {...props} className={styles.input} type="date" value={draft.publishedAt} onChange={(event) => update("publishedAt", event.target.value)} />}</Field>
            <Field field="updatedAt" label="Updated" optional issues={grouped}>{(props) => <input {...props} className={styles.input} type="date" value={draft.updatedAt} onChange={(event) => update("updatedAt", event.target.value)} />}</Field>
          </div>
          <Field field="featuredOrder" label="Home order" optional hint="0 appears first in the home page rail. Leave blank to list it by date after featured notes." issues={grouped}>{(props) => <input {...props} className={styles.input} type="number" min={0} step={1} inputMode="numeric" value={draft.featuredOrder} onChange={(event) => update("featuredOrder", event.target.value)} />}</Field>
          <Field field="download" label="Download" optional hint={<>A file in <code className={styles.code}>web/public</code>, e.g. <code className={styles.code}>/downloads/note.pdf</code>.</>} issues={grouped}>{(props) => <input {...props} className={styles.input} spellCheck={false} value={draft.download} onChange={(event) => update("download", event.target.value)} />}</Field>
        </fieldset></div>
        <div className={styles.panel}>
          <p className={`small-label ${styles.previewLabel}`}>Card preview</p>
          <div className={styles.previewCard} inert><ResearchCard item={preview} number={(preview.featuredOrder ?? 0) + 1} /></div>
        </div>
      </aside>
    </div>

    <div className={styles.saveBar}>
      <SaveStatus state={refreshing ? { tone: "saving", text: "Updating preview…" } : state} dirty={dirty} />
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} disabled={!ready || !dirty || state.tone === "saving" || refreshing || uploading} onClick={() => { if (window.confirm("Discard unsaved edits?")) { reset(); setWritingReset(value => value + 1); setCoverError(undefined); setIssues([]); setFailure(undefined); setState({ tone: "idle", text: "Edits reset to the last saved version" }); } }}>Reset edits</button>
        {record && <button type="button" className={`${styles.secondary} ${styles.delete}`} onClick={remove}><Trash2 size={15} aria-hidden="true" /><span className={styles.buttonText}>Remove</span></button>}
        {record && <Link className={styles.secondary} href={`/admin/research/${encodeURIComponent(record.id)}/preview/`} aria-label={dirty ? "Preview last saved version" : undefined}><Eye size={15} aria-hidden="true" /><span className={styles.buttonText}>Preview</span></Link>}
        <button type="submit" className="button-primary" disabled={!ready || state.tone === "saving" || refreshing || uploading}>{isNew ? "Create note" : "Save changes"}</button>
      </div>
    </div></fieldset>
  </form>;
}
