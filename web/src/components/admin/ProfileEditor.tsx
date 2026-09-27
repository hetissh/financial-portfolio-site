"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import type { Profile } from "@/lib/content-schema";
import { draftToProfile, emptyLink, groupIssues, profileToDraft, splitParagraphs, type ContentIssue, type ProfileDraft } from "@/lib/admin/form";
import { ErrorSummary, Field, SaveStatus, sendJson, useEditorState, type SaveState } from "./fields";
import styles from "./admin.module.css";

export function ProfileEditor({ profile, version }: { profile: Profile; version: string }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const { draft, update, dirty, markSaved, reset, ready } = useEditorState<ProfileDraft>(profileToDraft(profile), draftToProfile, formRef);
  const [currentVersion, setVersion] = useState(version);
  const [issues, setIssues] = useState<ContentIssue[]>([]);
  const [failure, setFailure] = useState<string>();
  const [state, setState] = useState<SaveState>({ tone: "idle", text: "Saved in src/content/profile.json" });
  const grouped = groupIssues(issues);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (state.tone === "saving" || refreshing) return;
    setState({ tone: "saving", text: "Saving…" });
    const { ok, payload } = await sendJson("/admin/api/profile/", "PUT", draftToProfile(draft), currentVersion);
    setIssues(payload.issues ?? []);
    setFailure(ok || payload.issues ? undefined : payload.message);
    if (!ok) { setState({ tone: "error", text: payload.message ?? "Could not save." }); return; }
    setVersion((payload.record as { version: string }).version);
    markSaved(draft);
    setState({ tone: "ok", text: "Saved to src/content/profile.json" });
    startRefresh(() => router.refresh());
  }

  return <form ref={formRef} onSubmit={save} noValidate>
    <ErrorSummary issues={issues} message={failure} />
    <fieldset className={styles.editorLock} disabled={!ready || state.tone === "saving" || refreshing}><legend className={styles.srOnly}>Profile editor</legend>
    <div className={styles.editorGrid}>
      <div>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Identity</legend>
          <p className={styles.intro}>Shown in the header, footer, page titles, and social previews.</p>
          <div className={`${styles.row2} ${styles.identityRow}`}>
            <Field field="displayName" label="Name" issues={grouped}>{(props) => <input {...props} className={styles.input} autoComplete="off" value={draft.displayName} onChange={(event) => update("displayName", event.target.value)} />}</Field>
            <Field field="monogram" label="Monogram" issues={grouped}>{(props) => <input {...props} className={styles.input} placeholder="Up to 3 characters" maxLength={3} value={draft.monogram} onChange={(event) => update("monogram", event.target.value)} />}</Field>
          </div>
          <Field field="role" label="Role" hint="The small line under your name in the header." issues={grouped}>{(props) => <input {...props} className={styles.input} value={draft.role} onChange={(event) => update("role", event.target.value)} />}</Field>
        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Home page</legend>
          <p className={styles.intro}>The large headline’s second line is set in green italics.</p>
          <div className={styles.row2}>
            <Field field="headline" label="Headline" issues={grouped}>{(props) => <input {...props} className={styles.input} value={draft.headline} onChange={(event) => update("headline", event.target.value)} />}</Field>
            <Field field="headlineAccent" label="Headline accent" optional issues={grouped}>{(props) => <input {...props} className={styles.input} value={draft.headlineAccent} onChange={(event) => update("headlineAccent", event.target.value)} />}</Field>
          </div>
          <Field field="intro" label="Introduction" hint="Also used as the site description for search engines." issues={grouped}>{(props) => <textarea {...props} className={styles.input} rows={3} value={draft.intro} onChange={(event) => update("intro", event.target.value)} />}</Field>

        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>The person behind the notes</legend>
          <p className={styles.intro}>Edit the heading, biography and principles shown in your About section.</p>
          <Field field="about.label" label="About section label" issues={grouped}>{props => <input {...props} className={styles.input} value={draft.about.label} onChange={e => update("about", { ...draft.about, label: e.target.value })} />}</Field>
          <Field field="about.heading" label="About heading" hint="Use a new line to choose where the heading breaks." issues={grouped}>{props => <textarea {...props} className={styles.input} rows={2} value={draft.about.heading} onChange={e => update("about", { ...draft.about, heading: e.target.value })} />}</Field>
          <Field field="about.accent" label="About heading accent" optional issues={grouped}>{props => <input {...props} className={styles.input} value={draft.about.accent} onChange={e => update("about", { ...draft.about, accent: e.target.value })} />}</Field>
          <Field field="bio" label="Biography" hint="Shown in the About section. Separate paragraphs with a blank line." issues={grouped}>{(props) => <textarea {...props} className={`${styles.input} ${styles.tall}`} value={draft.bio} onChange={(event) => update("bio", event.target.value)} />}</Field>
          <Field field="about.principles" label="Principles" hint="One statement per line, up to eight. Leave blank to hide them." issues={grouped}>{props => <textarea {...props} className={styles.input} rows={4} value={draft.about.principles.join("\n")} onChange={e => update("about", { ...draft.about, principles: e.target.value.split("\n") })} />}</Field>
        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Contact</legend>
          <Field field="contact.label" label="Contact section label" issues={grouped}>{props => <input {...props} className={styles.input} value={draft.contact.label} onChange={e => update("contact", { ...draft.contact, label: e.target.value })} />}</Field>
          <Field field="contact.heading" label="Contact heading" issues={grouped}>{props => <textarea {...props} className={styles.input} rows={2} value={draft.contact.heading} onChange={e => update("contact", { ...draft.contact, heading: e.target.value })} />}</Field>
          <Field field="contact.accent" label="Contact heading accent" optional issues={grouped}>{props => <input {...props} className={styles.input} value={draft.contact.accent} onChange={e => update("contact", { ...draft.contact, accent: e.target.value })} />}</Field>
          <Field field="contact.intro" label="Contact introduction" issues={grouped}>{props => <textarea {...props} className={styles.input} rows={3} value={draft.contact.intro} onChange={e => update("contact", { ...draft.contact, intro: e.target.value })} />}</Field>
          <Field field="contact.email" label="Contact email" optional hint="Visitors can open their email app with this address and the subject below filled in." issues={grouped}>{props => <input {...props} className={styles.input} type="email" autoComplete="off" placeholder="you@example.com" value={draft.contact.email} onChange={e => update("contact", { ...draft.contact, email: e.target.value })} />}</Field>
          <div className={styles.row2}>
            <Field field="contact.emailLabel" label="Email link label" issues={grouped}>{props => <input {...props} className={styles.input} value={draft.contact.emailLabel} onChange={e => update("contact", { ...draft.contact, emailLabel: e.target.value })} />}</Field>
            <Field field="contact.emailSubject" label="Email subject" issues={grouped}>{props => <input {...props} className={styles.input} value={draft.contact.emailSubject} onChange={e => update("contact", { ...draft.contact, emailSubject: e.target.value })} />}</Field>
          </div>
          <p className={styles.intro}>Use <code className={styles.code}>mailto:</code> or full https:// addresses. Links without both a label and address are left out.</p>
          {draft.contactLinks.map((link, index) => <div className={`${styles.linkRow} ${styles.contactLinkRow}`} key={link.key} role="group" aria-label={`Contact link ${index + 1}`}>
            <Field field={`contactLinks.${index}.label`} label={`Link ${index + 1} label`} issues={grouped}>{(props) => <input {...props} className={styles.input} placeholder="LinkedIn" value={link.label} onChange={(event) => update("contactLinks", draft.contactLinks.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} />}</Field>
            <Field field={`contactLinks.${index}.href`} label="Address" issues={grouped}>{(props) => <input {...props} className={styles.input} inputMode="url" spellCheck={false} placeholder="https:// or mailto:" value={link.href} onChange={(event) => update("contactLinks", draft.contactLinks.map((item, i) => i === index ? { ...item, href: event.target.value } : item))} />}</Field>
            <div className={styles.iconButtons}>
            <button type="button" className={styles.iconButton} disabled={index === 0} aria-label={`Move contact link ${index + 1} up`} onClick={() => { const links = [...draft.contactLinks]; [links[index - 1], links[index]] = [links[index], links[index - 1]]; update("contactLinks", links); }}>↑</button>
            <button type="button" className={styles.iconButton} disabled={index === draft.contactLinks.length - 1} aria-label={`Move contact link ${index + 1} down`} onClick={() => { const links = [...draft.contactLinks]; [links[index + 1], links[index]] = [links[index], links[index + 1]]; update("contactLinks", links); }}>↓</button>
            <button type="button" className={`${styles.iconButton} ${styles.danger}`} onClick={() => update("contactLinks", draft.contactLinks.filter((_, i) => i !== index))} aria-label={`Remove contact link ${index + 1}`}><X size={16} aria-hidden="true" /></button></div>
          </div>)}
          <button type="button" className={styles.addButton} onClick={() => update("contactLinks", [...draft.contactLinks, emptyLink()])}><Plus size={15} aria-hidden="true" /> Add link</button>
        </fieldset>
      </div>
      <aside className={styles.side} aria-label="Release and preview">
        <div className={styles.panel}><fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Release</legend>
          <Field field="resume" label="Résumé" optional hint={<>A file in <code className={styles.code}>web/public</code>, e.g. <code className={styles.code}>/downloads/resume.pdf</code>.</>} issues={grouped}>{(props) => <input {...props} className={styles.input} spellCheck={false} value={draft.resume} onChange={(event) => update("resume", event.target.value)} />}</Field>
          <label className={styles.check}>
            <input type="checkbox" checked={draft.approved} onChange={(event) => update("approved", event.target.checked)} />
            <span>Approved for release<small>Production builds refuse to run until the profile is approved. Tick this only after reviewing every field.</small></span>
          </label>
        </fieldset></div>
        <div className={styles.panel} aria-hidden="true">
          <p className={`small-label ${styles.previewLabel}`}>Headline preview</p>
          <p className={styles.headlinePreview}>{draft.headline || "Headline"}{draft.headlineAccent && <em>{draft.headlineAccent}</em>}</p>
          <p className={styles.panelNote}>{draft.intro}</p>
          <p className={styles.panelNote}>{splitParagraphs(draft.bio).length} biography paragraph{splitParagraphs(draft.bio).length === 1 ? "" : "s"} · {draft.contactLinks.length} contact link{draft.contactLinks.length === 1 ? "" : "s"}</p>
        </div>
      </aside>
    </div>
    <div className={styles.saveBar}>
      <SaveStatus state={refreshing ? { tone: "saving", text: "Updating preview…" } : state} dirty={dirty} />
      <div className={styles.actions}><button type="button" className={styles.secondary} disabled={!ready || !dirty || state.tone === "saving" || refreshing} onClick={() => { if (window.confirm("Discard unsaved edits?")) { reset(); setIssues([]); setFailure(undefined); setState({ tone: "idle", text: "Edits reset to the last saved version" }); } }}>Reset edits</button><button type="submit" className="button-primary" disabled={!ready || state.tone === "saving" || refreshing}>Save profile</button></div>
    </div></fieldset>
  </form>;
}
