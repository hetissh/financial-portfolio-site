"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertCircle, Check, LoaderCircle } from "lucide-react";
import { describeField, fieldId, issueField, type ContentIssue } from "@/lib/admin/form";
import styles from "./admin.module.css";

const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

type Issues = Map<string, string[]>;
type ControlProps = { id: string; "aria-invalid": boolean; "aria-describedby"?: string };

export function Field({ field, label, optional, hint, issues, children }: { field: string; label: string; optional?: boolean; hint?: React.ReactNode; issues: Issues; children: (props: ControlProps) => React.ReactNode }) {
  const id = fieldId(field);
  const errors = issues.get(field);
  const describedBy = [hint && `${id}-hint`, errors && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return <div className={styles.field}>
    <label className={styles.label} htmlFor={id}>{label}{optional && <span className={styles.optional}> (optional)</span>}</label>
    {children({ id, "aria-invalid": Boolean(errors), "aria-describedby": describedBy })}
    {hint && <p className={styles.hint} id={`${id}-hint`}>{hint}</p>}
    {errors && <p className={styles.error} id={`${id}-error`}>{errors.join(" ")}</p>}
  </div>;
}

export function ErrorSummary({ issues, message }: { issues: ContentIssue[]; message?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (issues.length || message) ref.current?.focus(); }, [issues, message]);
  if (!issues.length && !message) return null;
  return <div className={styles.summary} ref={ref} tabIndex={-1} role="alert" aria-labelledby="error-summary-title">
    <h2 id="error-summary-title">{issues.length ? `Fix ${issues.length === 1 ? "this problem" : `these ${issues.length} problems`} before saving` : message}</h2>
    {issues.length > 0 && <ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}>
      {issue.path ? <a href={`#${fieldId(issueField(issue.path))}`}>{describeField(issueField(issue.path))}</a> : "Note"}: {issue.message}
    </li>)}</ul>}
  </div>;
}

export type SaveState = { tone: "idle" | "saving" | "ok" | "error"; text: string };
export function SaveStatus({ state, dirty }: { state: SaveState; dirty: boolean }) {
  // Saving and errors take precedence; otherwise pending edits replace an old "Saved" message.
  const shown: SaveState = state.tone === "saving" || state.tone === "error" || !dirty ? state : { tone: "idle", text: "Unsaved changes" };
  const Icon = { saving: LoaderCircle, ok: Check, error: AlertCircle, idle: null }[shown.tone];
  return <p className={styles.status} data-tone={shown.tone} role="status">{Icon && <Icon size={15} aria-hidden="true" />}{shown.text}</p>;
}

export async function sendJson(url: string, method: "POST" | "PUT" | "DELETE", body?: unknown, version?: string): Promise<{ ok: boolean; payload: { record?: unknown; message?: string; issues?: ContentIssue[] } }> {
  try {
    const headers: Record<string, string> = { 'X-Portfolio-Admin': '1' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (version) headers['if-match'] = `"${version}"`;
    const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const payload = await response.json().catch(() => ({ message: `The server responded with ${response.status}.` }));
    return { ok: response.ok, payload: payload as { record?: unknown; message?: string; issues?: ContentIssue[] } };
  } catch { return { ok: false, payload: { message: 'Could not connect to the admin server. Your edits are still here. Restart npm run admin and try again.' } }; }
}

/** Tracks unsaved edits, warns before leaving the page, and saves with ⌘S / Ctrl+S. */
export function useEditorState<T>(initial: T, serialize: (value: T) => unknown, formRef: React.RefObject<HTMLFormElement | null>) {
  // Disable server-rendered inputs until React has attached their handlers.
  // Otherwise an early first edit can be replaced by the hydrated initial value.
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const savedDraft = useRef(initial);
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(serialize(initial)));
  const dirty = JSON.stringify(serialize(draft)) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.hasAttribute('download') || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const next = new URL(link.href);
      if (next.origin === location.origin && next.pathname === location.pathname && next.search === location.search) return;
      if (!window.confirm('Leave this page and discard unsaved changes?')) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    document.addEventListener('click', navigate, true);
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", navigate, true); };
  }, [dirty]);
  useEffect(() => {
    const save = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); formRef.current?.requestSubmit(); }
    };
    window.addEventListener("keydown", save);
    return () => window.removeEventListener("keydown", save);
  }, [formRef]);
  const update = <K extends keyof T>(key: K, value: T[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const markSaved = (value: T) => { savedDraft.current = value; setSaved(JSON.stringify(serialize(value))); };
  const reset = () => setDraft(savedDraft.current);
  return { draft, setDraft, update, dirty, markSaved, reset, ready };
}
