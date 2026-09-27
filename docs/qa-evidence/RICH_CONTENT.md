# Profile sections and formatted research

Profile → The person behind the notes edits the section label, heading, green italic accent, biography and principles. Profile → Contact edits its label, heading/accent, introduction, email address, email link label and subject, and contact links. Links can be reordered. Existing profile values remain unchanged until saved.

The email link opens the visitor’s email app with the configured recipient and subject. The site does not submit or deliver messages itself. Website form delivery requires a separately configured email service and public server endpoint; the local admin API is not a public mail sender.

Research → Sections keeps existing section headings and the table of contents. The writing editor supports bold, italic, HTTPS/mailto links, subheadings, bullets, numbered lists, lower/uppercase lettered lists, undo and redo. Bold introductory words can be used for worded points. Reflection prompts remain separate.

To insert an image, put the cursor where it should appear, enter alternative text and an optional caption, then import a JPEG, PNG or WebP up to 10 MB. Original proportions are preserved. Optional cropping offers original proportions, square, landscape or portrait. Select an inserted image to change its alternative text, caption or width, crop, replace or remove it. Images can sit inside a paragraph or on their own line. Public articles render the same structured content as admin previews.

Legacy paragraphs continue to render and load into the editor. Editing section text creates a versioned rich document; there is no bulk content rewrite. Structured content is validated server-side, rendered through React elements, and contributes to reading time. Image originals and drafts remain private. Build exports only referenced image derivatives for visible notes and removes obsolete generated image files.

Validation completed on 27 September 2026:

- 56 unit tests passed, including rich document validation, legacy round trips, profile defaults/email validation, original image proportions and optional crops.
- All 24 distinct admin browser checks passed across Chromium, Firefox and mobile WebKit. The existing 18 workflows passed in the full run; the six new feature cases passed after addressing formatted-link target size. Coverage includes profile save/reopen/reset and validation; formatting and links; list styles; inline image import, width, cropping, save/reopen/reset and article preview; keyboard/mobile layout and automated accessibility.
- 15 public browser regression checks passed across five desktop/mobile profiles: rendering, narrow-screen layouts, automated accessibility and admin exclusion.
- Separate Chromium/Firefox/WebKit inspections verified a formatted static article at 320, 390 and 1440 pixels, image loading and automated accessibility. Chromium also verified reading without JavaScript and captured desktop/mobile admin and article layouts.
- An isolated static build exported only the visible article-image derivative. Draft images, private draft routes and original images were absent.
- Lint, TypeScript and the static build passed. Existing profile/research JSON was not migrated or replaced.

The email behaviour is a mailto link. Real outgoing email delivery was not tested or enabled because no website-form email service was selected.
