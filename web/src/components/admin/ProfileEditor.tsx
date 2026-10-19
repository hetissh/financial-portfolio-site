// Edits and validates the local profile with explicit save and reset actions.
'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { profileSchema, type Profile } from '@/lib/content-schema';
import {
  draftToProfile,
  emptyCertification,
  emptyLink,
  groupIssues,
  profileToDraft,
  splitParagraphs,
  type ContentIssue,
  type ProfileDraft,
} from '@/lib/admin/form';
import {
  ErrorSummary,
  Field,
  SaveStatus,
  savedVersion,
  sendJson,
  useEditorState,
  type SaveState,
} from './fields';
import styles from './admin.module.css';

export function ProfileEditor({
  profile,
  version,
  mode = 'profile',
}: {
  profile: Profile;
  version: string;
  mode?: 'home' | 'profile';
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const { draft, update, dirty, markSaved, reset, ready } = useEditorState<ProfileDraft>(
    profileToDraft(profile),
    draftToProfile,
    formRef,
  );
  const [currentVersion, setVersion] = useState(version);
  const [issues, setIssues] = useState<ContentIssue[]>([]);
  const [failure, setFailure] = useState<string>();
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string>();
  const [uploadingCertification, setUploadingCertification] = useState<number>();
  const [certificationError, setCertificationError] = useState<{
    key: number;
    message: string;
  }>();
  const [state, setState] = useState<SaveState>({
    tone: 'idle',
    text: 'Saved profile',
  });
  const grouped = groupIssues(issues);
  const changeCertification = (
    index: number,
    changes: Partial<ProfileDraft['certifications'][number]>,
  ) =>
    update(
      'certifications',
      draft.certifications.map((item, position) =>
        position === index ? { ...item, ...changes } : item,
      ),
    );

  async function uploadResume(file: File) {
    setResumeError(undefined);
    if (file.size > 5 * 1024 * 1024 || !/\.pdf$/i.test(file.name)) {
      setResumeError('Choose a PDF résumé up to 5 MB.');
      return;
    }
    setUploadingResume(true);
    try {
      const body = new FormData();
      body.set('file', file);
      const response = await fetch('/admin/api/profile/resume/', {
        method: 'POST',
        headers: { 'X-Portfolio-Admin': '1' },
        body,
      });
      const payload: unknown = await response.json();
      const record = payload && typeof payload === 'object' ? payload : {};
      const resume = 'resume' in record ? record.resume : undefined;
      if (
        !response.ok ||
        typeof resume !== 'string' ||
        !/^\/downloads\/resumes\/[\w-]+\.pdf$/.test(resume)
      )
        throw new Error(
          'message' in record && typeof record.message === 'string'
            ? record.message
            : 'Could not upload the résumé.',
        );
      update('resume', resume);
    } catch (error) {
      setResumeError(error instanceof Error ? error.message : 'Could not upload the résumé.');
    } finally {
      setUploadingResume(false);
    }
  }

  async function uploadCertification(file: File, index: number) {
    const key = draft.certifications[index].key;
    setCertificationError(undefined);
    if (file.size > 5 * 1024 * 1024 || !/\.pdf$/i.test(file.name)) {
      setCertificationError({ key, message: 'Choose a certification PDF up to 5 MB.' });
      return;
    }
    setUploadingCertification(key);
    try {
      const body = new FormData();
      body.set('file', file);
      const response = await fetch('/admin/api/profile/certifications/', {
        method: 'POST',
        headers: { 'X-Portfolio-Admin': '1' },
        body,
      });
      const payload: unknown = await response.json();
      const record = payload && typeof payload === 'object' ? payload : {};
      const pdf = 'pdf' in record ? record.pdf : undefined;
      if (
        !response.ok ||
        typeof pdf !== 'string' ||
        !/^\/downloads\/certifications\/[0-9a-f-]+\.pdf$/.test(pdf)
      )
        throw new Error(
          'message' in record && typeof record.message === 'string'
            ? record.message
            : 'Could not upload the certification PDF.',
        );
      changeCertification(index, { pdf });
    } catch (error) {
      setCertificationError({
        key,
        message: error instanceof Error ? error.message : 'Could not upload the certification PDF.',
      });
    } finally {
      setUploadingCertification(undefined);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (state.tone === 'saving' || refreshing) return;
    // The saved version travels with the request to reject stale profile edits.
    setState({ tone: 'saving', text: 'Saving…' });
    const { ok, payload } = await sendJson(
      '/admin/api/profile/',
      'PUT',
      draftToProfile(draft),
      currentVersion,
    );
    setIssues(payload.issues ?? []);
    setFailure(ok || payload.issues ? undefined : payload.message);
    if (!ok) {
      setState({ tone: 'error', text: payload.message ?? 'Could not save.' });
      return;
    }
    const saved = profileSchema.safeParse(payload.record);
    const nextVersion = savedVersion(payload.record);
    if (!saved.success || !nextVersion) {
      setState({
        tone: 'error',
        text: 'The admin returned an invalid save response. Reload before trying again.',
      });
      return;
    }
    setVersion(nextVersion);
    markSaved(draft);
    setState({ tone: 'ok', text: 'Profile saved' });
    startRefresh(() => router.refresh());
  }

  return (
    <form
      ref={formRef}
      onSubmit={save}
      noValidate
      className={mode === 'home' ? styles.homeMode : styles.profileMode}
    >
      <ErrorSummary issues={issues} message={failure} />
      <fieldset
        className={styles.editorLock}
        disabled={
          !ready ||
          state.tone === 'saving' ||
          refreshing ||
          uploadingResume ||
          uploadingCertification !== undefined
        }
      >
        <legend className={styles.srOnly}>
          {mode === 'home' ? 'Homepage editor' : 'Profile editor'}
        </legend>
        <div className={styles.editorGrid}>
          <div>
            <fieldset className={`${styles.fieldset} ${styles.profileOnly}`}>
              <legend className={styles.legend}>Identity</legend>
              <p className={styles.intro}>
                Your name and initials appear in the site header and portfolio icon.
              </p>
              <div className={`${styles.row2} ${styles.identityRow}`}>
                <Field field="displayName" label="Name" issues={grouped}>
                  {(props) => (
                    <input
                      {...props}
                      className={styles.input}
                      autoComplete="off"
                      value={draft.displayName}
                      onChange={(event) => update('displayName', event.target.value)}
                    />
                  )}
                </Field>
                <Field field="monogram" label="Monogram" issues={grouped}>
                  {(props) => (
                    <input
                      {...props}
                      className={styles.input}
                      placeholder="Up to 3 characters"
                      maxLength={3}
                      value={draft.monogram}
                      onChange={(event) => update('monogram', event.target.value)}
                    />
                  )}
                </Field>
              </div>
              <Field
                field="role"
                label="Role"
                hint="The small line under your name in the header."
                issues={grouped}
              >
                {(props) => (
                  <input
                    {...props}
                    className={styles.input}
                    value={draft.role}
                    onChange={(event) => update('role', event.target.value)}
                  />
                )}
              </Field>
            </fieldset>
            <fieldset className={`${styles.fieldset} ${styles.homeOnly}`}>
              <legend className={styles.legend}>Home page</legend>
              <p className={styles.intro}>
                Edit the title on the card and header, the hero description, and the research
                transition.
              </p>
              <Field
                field="portfolioTitle"
                label="Portfolio title"
                hint="Shown in the header, hero and spinning card."
                issues={grouped}
              >
                {(props) => (
                  <input
                    {...props}
                    className={styles.input}
                    maxLength={70}
                    value={draft.portfolioTitle}
                    onChange={(event) => update('portfolioTitle', event.target.value)}
                  />
                )}
              </Field>
              <Field
                field="intro"
                label="Introduction"
                hint="Also used as the site description for search engines."
                issues={grouped}
              >
                {(props) => (
                  <textarea
                    {...props}
                    className={styles.input}
                    rows={3}
                    value={draft.intro}
                    onChange={(event) => update('intro', event.target.value)}
                  />
                )}
              </Field>
              <div className={styles.row2}>
                <Field
                  field="researchLead"
                  label="Research introduction, first line"
                  issues={grouped}
                >
                  {(props) => (
                    <input
                      {...props}
                      className={styles.input}
                      maxLength={100}
                      value={draft.researchLead}
                      onChange={(event) => update('researchLead', event.target.value)}
                    />
                  )}
                </Field>
                <Field
                  field="researchAccent"
                  label="Research introduction, second line"
                  issues={grouped}
                >
                  {(props) => (
                    <input
                      {...props}
                      className={styles.input}
                      maxLength={100}
                      value={draft.researchAccent}
                      onChange={(event) => update('researchAccent', event.target.value)}
                    />
                  )}
                </Field>
              </div>
            </fieldset>
            <fieldset className={`${styles.fieldset} ${styles.profileOnly}`}>
              <legend className={styles.legend}>Saved About content</legend>
              <p className={styles.intro}>
                Preserved for future use. The About section is currently hidden from the public
                site.
              </p>
              <Field field="about.label" label="About section label" issues={grouped}>
                {(props) => (
                  <input
                    {...props}
                    className={styles.input}
                    value={draft.about.label}
                    onChange={(e) => update('about', { ...draft.about, label: e.target.value })}
                  />
                )}
              </Field>
              <Field
                field="about.heading"
                label="About heading"
                hint="Use a new line to choose where the heading breaks."
                issues={grouped}
              >
                {(props) => (
                  <textarea
                    {...props}
                    className={styles.input}
                    rows={2}
                    value={draft.about.heading}
                    onChange={(e) => update('about', { ...draft.about, heading: e.target.value })}
                  />
                )}
              </Field>
              <Field field="about.accent" label="About heading accent" optional issues={grouped}>
                {(props) => (
                  <input
                    {...props}
                    className={styles.input}
                    value={draft.about.accent}
                    onChange={(e) => update('about', { ...draft.about, accent: e.target.value })}
                  />
                )}
              </Field>
              <Field
                field="bio"
                label="Biography"
                hint="Saved for future use. Separate paragraphs with a blank line."
                issues={grouped}
              >
                {(props) => (
                  <textarea
                    {...props}
                    className={`${styles.input} ${styles.tall}`}
                    value={draft.bio}
                    onChange={(event) => update('bio', event.target.value)}
                  />
                )}
              </Field>
              <Field
                field="about.principles"
                label="Principles"
                hint="One statement per line, up to eight. Leave blank to hide them."
                issues={grouped}
              >
                {(props) => (
                  <textarea
                    {...props}
                    className={styles.input}
                    rows={4}
                    value={draft.about.principles.join('\n')}
                    onChange={(e) =>
                      update('about', { ...draft.about, principles: e.target.value.split('\n') })
                    }
                  />
                )}
              </Field>
            </fieldset>
            <fieldset className={`${styles.fieldset} ${styles.profileOnly}`}>
              <legend className={styles.legend}>Saved Contact content</legend>
              <p className={styles.intro}>
                The longer Contact heading and introduction are saved for future use. The email and
                links below appear in the compact contact area when provided.
              </p>
              <Field field="contact.label" label="Contact section label" issues={grouped}>
                {(props) => (
                  <input
                    {...props}
                    className={styles.input}
                    value={draft.contact.label}
                    onChange={(e) => update('contact', { ...draft.contact, label: e.target.value })}
                  />
                )}
              </Field>
              <Field field="contact.heading" label="Contact heading" issues={grouped}>
                {(props) => (
                  <textarea
                    {...props}
                    className={styles.input}
                    rows={2}
                    value={draft.contact.heading}
                    onChange={(e) =>
                      update('contact', { ...draft.contact, heading: e.target.value })
                    }
                  />
                )}
              </Field>
              <Field
                field="contact.accent"
                label="Contact heading accent"
                optional
                issues={grouped}
              >
                {(props) => (
                  <input
                    {...props}
                    className={styles.input}
                    value={draft.contact.accent}
                    onChange={(e) =>
                      update('contact', { ...draft.contact, accent: e.target.value })
                    }
                  />
                )}
              </Field>
              <Field field="contact.intro" label="Contact introduction" issues={grouped}>
                {(props) => (
                  <textarea
                    {...props}
                    className={styles.input}
                    rows={3}
                    value={draft.contact.intro}
                    onChange={(e) => update('contact', { ...draft.contact, intro: e.target.value })}
                  />
                )}
              </Field>
              <Field
                field="contact.email"
                label="Contact email"
                optional
                hint="Visitors can open their email app with this address and the subject below filled in."
                issues={grouped}
              >
                {(props) => (
                  <input
                    {...props}
                    className={styles.input}
                    type="email"
                    autoComplete="off"
                    placeholder="you@example.com"
                    value={draft.contact.email}
                    onChange={(e) => update('contact', { ...draft.contact, email: e.target.value })}
                  />
                )}
              </Field>
              <div className={styles.row2}>
                <Field field="contact.emailLabel" label="Email link label" issues={grouped}>
                  {(props) => (
                    <input
                      {...props}
                      className={styles.input}
                      value={draft.contact.emailLabel}
                      onChange={(e) =>
                        update('contact', { ...draft.contact, emailLabel: e.target.value })
                      }
                    />
                  )}
                </Field>
                <Field field="contact.emailSubject" label="Email subject" issues={grouped}>
                  {(props) => (
                    <input
                      {...props}
                      className={styles.input}
                      value={draft.contact.emailSubject}
                      onChange={(e) =>
                        update('contact', { ...draft.contact, emailSubject: e.target.value })
                      }
                    />
                  )}
                </Field>
              </div>
              <p className={styles.intro}>
                Use <code className={styles.code}>mailto:</code> or full https:// addresses. Links
                without both a label and address are left out.
              </p>
              {draft.contactLinks.map((link, index) => (
                <div
                  className={`${styles.linkRow} ${styles.contactLinkRow}`}
                  key={link.key}
                  role="group"
                  aria-label={`Contact link ${index + 1}`}
                >
                  <Field
                    field={`contactLinks.${index}.label`}
                    label={`Link ${index + 1} label`}
                    issues={grouped}
                  >
                    {(props) => (
                      <input
                        {...props}
                        className={styles.input}
                        placeholder="LinkedIn"
                        value={link.label}
                        onChange={(event) =>
                          update(
                            'contactLinks',
                            draft.contactLinks.map((item, i) =>
                              i === index ? { ...item, label: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    )}
                  </Field>
                  <Field field={`contactLinks.${index}.href`} label="Address" issues={grouped}>
                    {(props) => (
                      <input
                        {...props}
                        className={styles.input}
                        inputMode="url"
                        spellCheck={false}
                        placeholder="https:// or mailto:"
                        value={link.href}
                        onChange={(event) =>
                          update(
                            'contactLinks',
                            draft.contactLinks.map((item, i) =>
                              i === index ? { ...item, href: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    )}
                  </Field>
                  <div className={styles.iconButtons}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={index === 0}
                      aria-label={`Move contact link ${index + 1} up`}
                      onClick={() => {
                        const links = [...draft.contactLinks];
                        [links[index - 1], links[index]] = [links[index], links[index - 1]];
                        update('contactLinks', links);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={index === draft.contactLinks.length - 1}
                      aria-label={`Move contact link ${index + 1} down`}
                      onClick={() => {
                        const links = [...draft.contactLinks];
                        [links[index + 1], links[index]] = [links[index], links[index + 1]];
                        update('contactLinks', links);
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.danger}`}
                      onClick={() =>
                        update(
                          'contactLinks',
                          draft.contactLinks.filter((_, i) => i !== index),
                        )
                      }
                      aria-label={`Remove contact link ${index + 1}`}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className={styles.addButton}
                onClick={() => update('contactLinks', [...draft.contactLinks, emptyLink()])}
              >
                <Plus size={15} aria-hidden="true" /> Add link
              </button>
            </fieldset>
            <fieldset className={`${styles.fieldset} ${styles.profileOnly}`}>
              <legend className={styles.legend}>Certifications</legend>
              <p className={styles.intro}>
                Add credentials you want to show below the research. Verification links are
                optional.
              </p>
              {draft.certifications.map((item, index) => (
                <div
                  key={item.key}
                  className={styles.certificationEditor}
                  role="group"
                  aria-label={`Certification ${index + 1}`}
                >
                  <div className={styles.row2}>
                    <Field
                      field={`certifications.${index}.name`}
                      label={`Certification ${index + 1} name`}
                      issues={grouped}
                    >
                      {(props) => (
                        <input
                          {...props}
                          className={styles.input}
                          value={item.name}
                          onChange={(event) =>
                            changeCertification(index, { name: event.target.value })
                          }
                        />
                      )}
                    </Field>
                    <Field field={`certifications.${index}.issuer`} label="Issuer" issues={grouped}>
                      {(props) => (
                        <input
                          {...props}
                          className={styles.input}
                          value={item.issuer}
                          onChange={(event) =>
                            changeCertification(index, { issuer: event.target.value })
                          }
                        />
                      )}
                    </Field>
                  </div>
                  <div className={styles.row2}>
                    <Field
                      field={`certifications.${index}.issuedAt`}
                      label="Issue date"
                      optional
                      issues={grouped}
                    >
                      {(props) => (
                        <input
                          {...props}
                          type="date"
                          className={styles.input}
                          value={item.issuedAt}
                          onChange={(event) =>
                            changeCertification(index, { issuedAt: event.target.value })
                          }
                        />
                      )}
                    </Field>
                    <Field
                      field={`certifications.${index}.expiresAt`}
                      label="Expiry date"
                      optional
                      issues={grouped}
                    >
                      {(props) => (
                        <input
                          {...props}
                          type="date"
                          className={styles.input}
                          value={item.expiresAt}
                          onChange={(event) =>
                            changeCertification(index, { expiresAt: event.target.value })
                          }
                        />
                      )}
                    </Field>
                  </div>
                  <div className={styles.row2}>
                    <Field
                      field={`certifications.${index}.credentialId`}
                      label="Credential ID"
                      optional
                      issues={grouped}
                    >
                      {(props) => (
                        <input
                          {...props}
                          className={styles.input}
                          value={item.credentialId}
                          onChange={(event) =>
                            changeCertification(index, { credentialId: event.target.value })
                          }
                        />
                      )}
                    </Field>
                    <Field
                      field={`certifications.${index}.url`}
                      label="Verification URL"
                      optional
                      issues={grouped}
                    >
                      {(props) => (
                        <input
                          {...props}
                          className={styles.input}
                          inputMode="url"
                          placeholder="https://"
                          value={item.url}
                          onChange={(event) =>
                            changeCertification(index, { url: event.target.value })
                          }
                        />
                      )}
                    </Field>
                  </div>
                  <Field
                    field={`certifications.${index}.pdf`}
                    label="Certification PDF"
                    optional
                    hint="Upload a PDF up to 5 MB, then save the profile."
                    issues={grouped}
                  >
                    {(props) => (
                      <input
                        {...props}
                        type="file"
                        accept="application/pdf,.pdf"
                        className={styles.input}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadCertification(file, index);
                          event.target.value = '';
                        }}
                      />
                    )}
                  </Field>
                  {uploadingCertification === item.key && (
                    <p className={styles.hint} role="status">
                      Uploading certification PDF…
                    </p>
                  )}
                  {certificationError?.key === item.key && (
                    <p className={styles.uploadError} role="alert">
                      {certificationError.message}
                    </p>
                  )}
                  {item.pdf && (
                    <p className={styles.hint}>
                      <a
                        href={`/admin/api/profile/certifications/?path=${encodeURIComponent(item.pdf)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open current PDF
                      </a>{' '}
                      ·{' '}
                      <button
                        type="button"
                        className={styles.textButton}
                        onClick={() => changeCertification(index, { pdf: '' })}
                      >
                        Remove PDF
                      </button>
                    </p>
                  )}
                  <div className={styles.certificationActions}>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={item.visible}
                        onChange={(event) =>
                          changeCertification(index, { visible: event.target.checked })
                        }
                      />
                      <span>Show on site</span>
                    </label>
                    <div className={styles.iconButtons}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        disabled={index === 0}
                        aria-label={`Move certification ${index + 1} up`}
                        onClick={() => {
                          const items = [...draft.certifications];
                          [items[index - 1], items[index]] = [items[index], items[index - 1]];
                          update('certifications', items);
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        disabled={index === draft.certifications.length - 1}
                        aria-label={`Move certification ${index + 1} down`}
                        onClick={() => {
                          const items = [...draft.certifications];
                          [items[index + 1], items[index]] = [items[index], items[index + 1]];
                          update('certifications', items);
                        }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconButton} ${styles.danger}`}
                        aria-label={`Remove certification ${index + 1}`}
                        onClick={() =>
                          update(
                            'certifications',
                            draft.certifications.filter((_, position) => position !== index),
                          )
                        }
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className={styles.addButton}
                onClick={() =>
                  update('certifications', [...draft.certifications, emptyCertification()])
                }
              >
                <Plus size={15} aria-hidden="true" /> Add certification
              </button>
            </fieldset>
          </div>
          <aside className={styles.side} aria-label="Release and preview">
            <div className={`${styles.panel} ${styles.profileOnly}`}>
              <fieldset className={`${styles.fieldset} ${styles.profileOnly}`}>
                <legend className={styles.legend}>Release</legend>
                <Field
                  field="resume"
                  label="Résumé"
                  optional
                  hint="Upload a PDF up to 5 MB, then save the profile. An existing public file path also works."
                  issues={grouped}
                >
                  {(props) => (
                    <input
                      {...props}
                      className={styles.input}
                      spellCheck={false}
                      value={draft.resume}
                      onChange={(event) => update('resume', event.target.value)}
                    />
                  )}
                </Field>
                <label className={styles.uploadLabel} htmlFor="resume-upload">
                  {uploadingResume ? 'Uploading résumé…' : 'Upload PDF résumé'}
                </label>
                <input
                  id="resume-upload"
                  type="file"
                  accept="application/pdf,.pdf"
                  className={styles.input}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadResume(file);
                    event.target.value = '';
                  }}
                />
                {resumeError && (
                  <p className={styles.uploadError} role="alert">
                    {resumeError}
                  </p>
                )}
                {draft.resume && (
                  <p className={styles.hint}>
                    <a
                      href={
                        /^\/downloads\/resumes\/[0-9a-f-]+\.pdf$/.test(draft.resume)
                          ? `/admin/api/profile/resume/?path=${encodeURIComponent(draft.resume)}`
                          : draft.resume
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open current résumé
                    </a>{' '}
                    ·{' '}
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() => {
                        update('resume', '');
                        update('resumeVisible', false);
                      }}
                    >
                      Remove from profile
                    </button>
                  </p>
                )}
                <Field field="resumeLabel" label="Résumé link label" optional issues={grouped}>
                  {(props) => (
                    <input
                      {...props}
                      className={styles.input}
                      maxLength={80}
                      value={draft.resumeLabel}
                      onChange={(event) => update('resumeLabel', event.target.value)}
                    />
                  )}
                </Field>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={draft.resumeVisible}
                    disabled={!draft.resume}
                    onChange={(event) => update('resumeVisible', event.target.checked)}
                  />
                  <span>Show résumé link on site</span>
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={draft.approved}
                    onChange={(event) => update('approved', event.target.checked)}
                  />
                  <span>
                    Approved for release
                    <small>
                      Production builds refuse to run until the profile is approved. Tick this only
                      after reviewing every field.
                    </small>
                  </span>
                </label>
              </fieldset>
            </div>
            <div
              className={`${styles.panel} ${styles.profileOnly}`}
              aria-label="Contact and credentials preview"
            >
              <p className={`small-label ${styles.previewLabel}`}>PUBLIC DETAILS PREVIEW</p>
              <h2 className={styles.professionalPreviewTitle}>Beyond the numbers.</h2>
              <ul className={styles.professionalPreviewList}>
                {draft.contact.email && <li>{draft.contact.emailLabel || 'Email me'}</li>}
                {draft.contactLinks
                  .filter((item) => item.label && item.href)
                  .map((item) => (
                    <li key={item.key}>{item.label}</li>
                  ))}
                {draft.resume && draft.resumeVisible && (
                  <li>{draft.resumeLabel || 'View résumé'}</li>
                )}
                {draft.certifications
                  .filter((item) => item.visible && item.name && item.issuer)
                  .map((item) => (
                    <li key={item.key}>
                      {item.name} · {item.issuer}
                    </li>
                  ))}
              </ul>
              {!draft.contact.email &&
                !draft.contactLinks.some((item) => item.label && item.href) &&
                !draft.resumeVisible &&
                !draft.certifications.some((item) => item.visible && item.name && item.issuer) && (
                  <p className={styles.hint}>
                    Add a contact method, résumé, or certification to show this section.
                  </p>
                )}
            </div>
            <div className={styles.panel} aria-hidden="true">
              <p className={`small-label ${styles.previewLabel}`}>Home journey preview</p>
              <div className={styles.journeyPreview}>
                <span>FINANCE / RESEARCH</span>
                <h2>{draft.portfolioTitle || 'Portfolio title'}</h2>
                <p>{draft.intro}</p>
                <div className={styles.journeyCard}>
                  <small>{draft.monogram || 'FP'} / RESEARCH</small>
                  <strong>Look closer.</strong>
                </div>
              </div>
              <p className={styles.researchPreview}>
                {draft.researchLead || 'Research introduction'}
                <em>{draft.researchAccent}</em>
              </p>
              <p className={styles.panelNote}>
                {splitParagraphs(draft.bio).length} biography paragraph
                {splitParagraphs(draft.bio).length === 1 ? '' : 's'} · {draft.contactLinks.length}{' '}
                contact link{draft.contactLinks.length === 1 ? '' : 's'}
              </p>
            </div>
          </aside>
        </div>
        <div className={styles.saveBar}>
          <SaveStatus
            state={refreshing ? { tone: 'saving', text: 'Updating preview…' } : state}
            dirty={dirty}
          />
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={!ready || !dirty || state.tone === 'saving' || refreshing}
              onClick={() => {
                if (window.confirm('Discard unsaved edits?')) {
                  reset();
                  setIssues([]);
                  setFailure(undefined);
                  setState({ tone: 'idle', text: 'Edits reset to the last saved version' });
                }
              }}
            >
              Reset edits
            </button>
            <button
              type="submit"
              className="button-primary"
              disabled={!ready || state.tone === 'saving' || refreshing}
            >
              Save {mode === 'home' ? 'homepage' : 'profile'}
            </button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
