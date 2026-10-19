// These reserved sample notes are maintained after each change request.
// The generator never touches the profile or any other research note.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parseResearch, researchSchema, type Research } from './content-schema';
import { heroPatterns } from './artwork';
import type { RichNode, RichMark } from './rich-content';

export const showcaseSlugs = [
  'showcase-formatting',
  'showcase-images',
  'showcase-workflow',
] as const;
export const showcaseImageIds = [
  '90f3fe01-a1b2-4c33-8d44-e55500000001',
  '90f3fe01-a1b2-4c33-8d44-e55500000002',
] as const;
const currentChange =
  'Add certification PDF uploads and prepare one cloud-backed server for the public site and admin.';
const text = (value: string, marks?: RichMark[]): RichNode => ({
  type: 'text',
  text: value,
  ...(marks ? { marks } : {}),
});
const paragraph = (...content: RichNode[]): RichNode => ({ type: 'paragraph', content });
const p = (value: string) => paragraph(text(value));
const item = (value: string, ...children: RichNode[]): RichNode => ({
  type: 'listItem',
  content: [p(value), ...children],
});
const bullets = (...content: RichNode[]): RichNode => ({ type: 'bulletList', content });
const numbers = (type: '1' | 'a' | 'A', ...content: RichNode[]): RichNode => ({
  type: 'orderedList',
  attrs: { start: 1, type },
  content,
});
const heading = (value: string, level = 3): RichNode => ({
  type: 'heading',
  attrs: { level },
  content: [text(value)],
});
const section = (title: string, ...content: RichNode[]) => ({
  heading: title,
  paragraphs: [],
  body: { version: 1 as const, doc: { type: 'doc', content } },
});
function image(index: 0 | 1, displayWidth: number, caption: string): RichNode {
  return {
    type: 'image',
    attrs: {
      src: `/images/articles/${showcaseImageIds[index]}.webp`,
      width: index ? 480 : 960,
      height: index ? 640 : 540,
      alt: index
        ? 'A portrait illustration with three stacked shapes'
        : 'An illustrative chart with four rising bars',
      caption,
      displayWidth,
    },
  };
}
export function makeShowcaseNotes(date: string, change = currentChange): Research[] {
  const base = {
    category: 'Showcase',
    tags: ['showcase', 'testing'],
    publishedAt: '2026-09-28',
    updatedAt: date,
    status: 'sample' as const,
    sources: [],
    attachments: [],
  };
  const latest = section(
    'Latest change',
    p(change),
    p(
      'These three sample notes are refreshed after each change request. Use the checks below to try the current features.',
    ),
    bullets(
      item(
        'Check formatting, images, notebook navigation and sheet links in these three notes after the repository-wide standards review. Source comments, formatting and dependency advisories are verified by code review and automated checks, not by saved note content.',
      ),
      item(
        'In local admin, a malformed or interrupted save response should leave the current profile, note, or notebook-order draft available for retry; reload before retrying when the server may have saved the change.',
      ),
      item(
        'In the content desk, Overview, Homepage, Research, Profile and Admin management each open the expected destination. Research stays active in a research editor. Check keyboard focus and mobile navigation.',
      ),
      item(
        'Overview keeps the blue grid visible, shows real published, draft and release counts, and lists compact research rows with usable order, edit and preview controls. Sample notes stay labelled as examples.',
      ),
      item(
        'In Overview, the Evidence in pictures pattern thumbnail shows repeated puzzle pieces at compact size rather than a cropped fragment. Its full research cover keeps the saved pattern appearance.',
      ),
      item(
        'Check the classic ivory and brass palette across home, research, article, and admin views: keep the navy grid visible, use warm reading and editing surfaces, and reserve brass for accents with readable contrast.',
      ),
      item(
        'Scroll to the bottom of the home, research, article and admin pages, including with a fast trackpad gesture. The footer should stay at the viewport edge without a large empty grid below it.',
      ),
      item(
        'With UNSPLASH_ACCESS_KEY configured in the private server environment, search Unsplash in the cover artwork picker, select a result, save the note and verify it hotlinks the Unsplash image and credits the photographer. Without a key, the picker should explain how to configure it.',
      ),
      item(
        'On the new-note page, open Unsplash in the cover picker and confirm its search stays inside the editor without nested forms or hydration errors.',
      ),
      item(
        'Open Homepage from the navigation or yellow overview action. Edit the portfolio title, introduction and two research transition lines; the preview should respond, and saving should update the public page. Profile still edits identity and saved About and Contact content.',
      ),
      item(
        'On the home page, the selected research rail has no “notes to explore” count label; its arrow controls appear only when the cards overflow. Visible résumé and certifications appear together in their own section after selected research. Hide them in Profile and confirm they disappear from the public home page.',
      ),
      item(
        'In Profile, attach a PDF up to 5 MB to a certification. Preview it before saving, then save and confirm its PDF action appears in the dedicated home credentials section. Hide the certification and confirm the public PDF link disappears. Invalid files should leave the draft editable.',
      ),
      item(
        'When the profile has visible credentials, the Credentials navigation link should take you to their home-page section from home or a research page. Contact should appear only when a contact method exists and should lead to the compact contact area.',
      ),
      item(
        'In the combined cloud server after the migration, sign in to Admin on the same origin as the public site; save a profile edit, image, workbook and certification PDF, then reload the public page. The saved files and content should persist after a server restart. Keep draft media inaccessible without an admin session.',
      ),
      item(
        'The overview Release panel shows blockers first and expands to all checks. Its profile action opens Profile; the production address remains an operator setting.',
      ),
      item(
        'On the combined site, use Admin in the main navigation or footer while signed out: the login form should appear. Sign in, return to the public page, and use Admin again to reach the content desk. The static export should have no Admin link. Admin management should show two account slots and no Remove access action for the current account. Password recovery and session revocation are verified by automated tests.',
      ),
      item(
        'In the content desk, choose Sign out. The main public page should open, and choosing Admin again should lead to login because the prior session ended.',
      ),
      item(
        'On login, reset, and Admin management password fields, use Show and Hide to inspect only the value you typed. The control should keep the value and never submit the form. Test fixture credentials do not change a live admin login.',
      ),
      item(
        'Keep local admin and Resend settings in the private web/.env.local file. Initial passwords are needed only for bootstrap; password changes use Admin management or reset. The live auth JSON contains hashes, and test fixture values never sign in to the live site.',
      ),
      item(
        'After an operator updates both private admin accounts, sign in with each updated email and password. Earlier sessions and pending recovery links should no longer grant access. Keep real credentials out of sample notes and test fixtures.',
      ),
      item(
        'Change the profile monogram, save, then reload a public page: the browser tab icon should show the same initials as the header. Rebuild the static preview to check its icon too.',
      ),
      item(
        'Edit Portfolio title, Introduction and both Research introduction lines in Profile. The admin journey preview updates before saving; after saving, reload home to see the title in the header, hero and card, the description beneath it, and the two research lines at the end of the scroll sequence.',
      ),
      item(
        'On home, move over a sheet cell: its faint formula should stay inside that cell. Scroll to turn the reflective card, raise the dashboard bars and reveal the allocation, cash-flow and trend widgets. At the end, the dashboard blurs and the research introduction appears before the selected notes.',
      ),
      item(
        'Open the notebook index and an article after the home sequence. Check the navy grid, ivory reading surfaces, brass accents, readable article text, and working navigation. Try a small screen and reduced motion.',
      ),
      item(
        'Follow the blue grid from the hero through selected research, the research index, an article, and the footer. Confirm the grid has no abrupt colour break and that note cards and article text remain readable on light panels.',
      ),
      item(
        'The home page ends after selected research. About and Contact no longer appear there or in the main navigation; their saved content remains editable in Profile. The admin keeps a subtle blue grid around solid form panels.',
      ),
      item(
        'Try an HTTPS source, contact or writing link containing user:password@ before the host. Saving should reject it; an ordinary HTTPS or mailto link should still work.',
      ),
      item(
        'Try an invalid image or workbook upload. The editor should explain the input problem and keep the note editable.',
      ),
      item(
        'If an upload fails or returns malformed data, the editor should show a retry message without exposing a filesystem path or parser detail. Keep the draft editable and retry after resolving the local problem.',
      ),
      item(
        'If a saved workbook preview is corrupt, content validation should report the missing usable attachment rather than rendering malformed rows. This failure is covered by automated tests, not by a sample note.',
      ),
    ),
  );
  return [
    researchSchema.parse({
      ...base,
      id: 'qa-formatting',
      slug: showcaseSlugs[0],
      title: 'Writing with clarity',
      summary:
        'A living example of bold and italic text, subheadings, visible bullets and nested numbered or lettered points.',
      theme: 'forest',
      cover: { type: 'theme', preset: 'forest', word: 'Clarity', color: '#dbe3d5', variation: 0 },
      question: 'How can a note make its structure easy to follow?',
      sections: [
        section(
          'Words and emphasis',
          paragraph(
            text('A clear opening. ', [{ type: 'bold' }]),
            text('A useful qualification. ', [{ type: 'italic' }]),
            text('Both together.', [{ type: 'bold' }, { type: 'italic' }]),
          ),
          heading('A useful subheading'),
          p('Use short paragraphs to separate the observation from the question.'),
          heading('A smaller heading', 4),
          paragraph(
            text('A soft line break stays in the same paragraph.'),
            { type: 'hardBreak' },
            text('Outside a list, press Shift+Enter to add one.'),
          ),
          paragraph(
            text('A worded point: ', [{ type: 'bold' }]),
            text('Lead with a short label, then explain the idea.'),
          ),
          paragraph(
            text('Read the example source', [
              { type: 'link', attrs: { href: 'https://example.com/' } },
            ]),
          ),
        ),
        section(
          'Visible bullets and nested points',
          bullets(
            item(
              'Start with the main observation.',
              bullets(
                item(
                  'Press Shift+Enter at the end to create a nested point.',
                  bullets(item('A third level has a square marker.')),
                ),
                item('Press Enter to add a point at the same level.'),
              ),
            ),
            item('Tab nests an existing point; Shift+Tab moves it out.'),
            item('Nest point and Unnest point buttons work with a mouse or touch.'),
          ),
        ),
        section(
          'Numbers and letters',
          heading('Numbered steps'),
          numbers(
            '1',
            item(
              'State the question.',
              numbers(
                '1',
                item('Identify the evidence.'),
                item('Separate assumptions from observations.'),
              ),
            ),
            item('Review the conclusion.'),
          ),
          heading('Lowercase letters'),
          numbers('a', item('First interpretation.'), item('Alternative interpretation.')),
          heading('Uppercase letters'),
          numbers('A', item('Supporting evidence.'), item('Open questions.')),
        ),
        section(
          'Try the writing checks',
          bullets(
            item('Edit this note in admin and check that bullet markers remain visible.'),
            item('Use Shift+Enter, Tab, Shift+Tab and the nesting buttons inside both list types.'),
            item('Try up to five list levels, then save, reload and preview.'),
            item(
              'When hosted editing is enabled, refresh the visitor article after a save and check that rich formatting updates without a rebuild.',
            ),
            item('Try bold, italic, headings, links, undo and redo; reset an unsaved edit.'),
            item(
              'Selected formatting buttons and keyboard focus use navy or yellow accents; list markers and text stay readable on the editor surface.',
            ),
            item(
              'The cover corner shows this note’s notebook number, independent of its artwork or variation.',
            ),
          ),
        ),
        latest,
      ],
    }),
    researchSchema.parse({
      ...base,
      id: 'qa-images',
      slug: showcaseSlugs[1],
      title: 'Evidence in pictures',
      summary:
        'Centered landscape and portrait images at every available width, with descriptions, captions and text on either side.',
      theme: 'blue',
      cover: {
        type: 'hero',
        hero: heroPatterns[0].id,
        word: 'Evidence',
        color: '#dce3e6',
        foregroundColor: '#365553',
        foregroundOpacity: 0.35,
        variation: 0,
      },
      question: 'Can images support the story without interrupting the reading order?',
      sections: [
        section(
          'Text before and after an image',
          paragraph(
            text(
              'This text precedes an image stored inside the same paragraph. The image is still centered.',
            ),
            image(0, 75, 'Landscape illustration at 75% width. Values are fictional.'),
            text('This text follows the image, keeping the original reading order.'),
          ),
        ),
        section(
          'Every image width',
          {
            type: 'heading',
            attrs: { level: 4 },
            content: [
              text('An image pasted into a heading'),
              image(1, 25, 'Centered image from a heading; the rendered HTML stays valid.'),
            ],
          },
          paragraph(image(0, 100, 'A full-width illustration.')),
          paragraph(image(0, 50, 'The same illustration at 50%, centered.')),
          paragraph(image(1, 25, 'A portrait illustration at 25%, centered.')),
          bullets(
            item(
              'Images within a list remain centered within that point.',
              paragraph(image(1, 50, 'Portrait image inside a bullet point.')),
            ),
          ),
        ),
        section(
          'Try the image checks',
          numbers(
            '1',
            item('Copy a PNG, JPEG or WebP image, place the cursor in the editor, then paste.'),
            item('Add alternative text and an optional caption in the paste dialog, then insert.'),
            item('Cancel a paste and confirm your text and cursor position are kept.'),
            item('Click an image to change its caption or choose 25%, 50%, 75% or 100% width.'),
            item(
              'Try original, square, landscape and portrait cropping; cancel or reset the crop.',
            ),
            item(
              'Save and reload. Check centering on desktop, mobile, in preview and without JavaScript.',
            ),
          ),
        ),
        section(
          'Import and artwork checks',
          bullets(
            item(
              'Import a file as well as pasting it. Unsupported or oversized images should show a useful error.',
            ),
            item('Theme artwork keeps its default word and colour, both editable after selection.'),
            item(
              'Browse all Hero Patterns and change the foreground colour, background colour and opacity.',
            ),
            item('Import a cover image and adjust its crop. Article image originals stay private.'),
            item(
              'When hosted media is enabled, only published image crops and downloads should be public; originals and draft media stay private.',
            ),
            item(
              'The navy admin controls must not recolour theme artwork, Hero Patterns, imported images or the saved article preview.',
            ),
            item(
              'Every cover type shows FIELD NOTES followed by the automatic note number. Cover types are not printed as labels.',
            ),
            item(
              'Enter a Note number override, save and reload; clear it to return to automatic numbering. Changing designs, crops and variations must keep that choice.',
            ),
          ),
        ),
        latest,
      ],
    }),
    researchSchema.parse({
      ...base,
      id: 'qa-workflow',
      slug: showcaseSlugs[2],
      title: 'From draft to conversation',
      summary:
        'A repeatable checklist for profile editing, contact links, research saves, sheets and responsive navigation.',
      theme: 'clay',
      cover: { type: 'theme', preset: 'clay', word: 'Review', color: '#eee0ce', variation: 0 },
      question: 'Does the whole journey work from editing a note to contacting its author?',
      sections: [
        section(
          'Profile and contact',
          bullets(
            item(
              'Edit the name and monogram; one, two and three characters fit without clipping, and the browser tab icon matches after saving and reloading.',
            ),
            item('Edit “The person behind the notes”: heading, accent, biography and principles.'),
            item('Edit Contact: heading, introduction, email, link label and subject.'),
            item('Reorder, add or remove contact links, then save and reload.'),
            item(
              'Add an HTTPS or mailto contact link, save, and check the compact public contact area after the research. Invalid and credential-bearing URLs should be rejected.',
            ),
            item(
              'Upload a PDF résumé, set its link label and visibility, save, then open it from the home-page credentials section above Certifications. Reject a non-PDF or file over 5 MB; hiding or removing the link should remove it from the public home page.',
            ),
            item(
              'Add, reorder and hide certifications. Visible entries show the name, issuer, issue date and optional verification link; invalid dates and URLs should block saving.',
            ),
            item(
              'When hosted editing is enabled, refresh the visitor site after a profile save and check that the new details and monogram appear without a rebuild.',
            ),
            item(
              'When hosted Supabase admin access is enabled, sign in as each of the two invited Auth users. The bound account slots should keep their fixed IDs; disabling the other slot should end its access, while the current account cannot disable itself.',
            ),
            item(
              'The email link opens a draft in your email app addressed to the saved profile email. Sending happens in that app.',
            ),
            item('An invalid email should prevent saving and explain the issue.'),
          ),
        ),
        section(
          'Research editing',
          numbers(
            '1',
            item(
              'The top admin navigation contains Overview, Homepage, Research, Profile and View site. Create a note using New note in Overview.',
            ),
            item(
              'Clear Tags to see Separate with commas. inside the input; there is no duplicate hint underneath. Tags remain editable and save as separate values.',
            ),
            item(
              'On a fresh admin load, wait for the fields to become available; the very first title edit must remain saved.',
            ),
            item('Create a draft with a title, summary, category, tags, question and sections.'),
            item(
              'On a new note, open Unsplash in Cover artwork. Its search region must not create a nested form, and the editor should hydrate without console errors.',
            ),
            item(
              'When hosted editing is enabled, publishing should make a note visible on the next visitor request while drafts stay hidden.',
            ),
            item('Change the slug, dates, section order and cover; save, reload and preview.'),
            item('Reset unsaved changes and confirm the saved content returns.'),
            item('Edit the same note in two tabs; a stale save should ask you to reload.'),
            item(
              'Check required fields and duplicate slugs before publishing. Citations are optional for published notes and production releases; any supplied links must be valid HTTPS addresses.',
            ),
            item(
              'Remove a temporary test note; its saved file should move to trash. Keep these three showcase notes.',
            ),
          ),
        ),
        section(
          'Hosted workbook viewers',
          numbers(
            '1',
            item(
              'In Sheets & models, paste a published Google Sheets embed URL or its iframe code. Preview before attaching and saving.',
            ),
            item(
              'For Excel, paste the generated OneDrive or SharePoint embed link. You can attach it directly or add it to an uploaded workbook.',
            ),
            item(
              'The note displays the provider’s spreadsheet inline with Open original, Reload and Expand controls. Pasted HTML must never execute in the site.',
            ),
            item(
              'Select another sheet inside the viewer, expand it, close it and confirm the selected view remains. The close button is always available; Escape closes when focus is on a viewer control outside the iframe.',
            ),
            item(
              'On mobile, the page should fit the screen while the spreadsheet scrolls within its own frame. Large views must close and return focus to Expand.',
            ),
            item(
              'Save, reload, preview, rename, reset and remove attachments. Reject invalid provider hosts, unrelated links and unsafe URLs without losing the note.',
            ),
            item(
              'An uploaded Excel file without a hosted embed retains its local sheet preview, formula display and original download. Clearing its embed link restores that preview.',
            ),
            item(
              'Published Google Sheets are read-only and do not show formulas. Access is controlled by the provider; if a viewer is blank or requests sign-in, Open original remains available.',
            ),
            item(
              'Test visitor access to the real hosted link in a private browser before release. Keep these notes as samples; no fake embed links are attached to them.',
            ),
          ),
        ),
        section(
          'Sheets and sources',
          bullets(
            item(
              'Upload an example Excel workbook, open each sheet and inspect formulas and values.',
            ),
            item('Download the workbook and confirm the filename and contents.'),
            item('Add a shared Google Sheets link, edit its label, open it and remove it.'),
            item(
              'Publish a note without citations; Further reading stays hidden. Add an HTTPS source and check that the section and link appear.',
            ),
            item('Missing or invalid attachments should show errors without losing the note.'),
          ),
        ),
        section(
          'Arrange the notebook',
          numbers(
            '1',
            item(
              'Use Show on home page in Publishing to select cards for the home rail; Overview arranges the selected cards too.',
            ),
            item(
              'In Admin Overview, drag a handle to move a research card. Dragging also works with touch; the page can scroll normally away from the handles.',
            ),
            item(
              'Use Move up or Move down, or focus a handle and press an arrow key. Home and End move to the first and last positions.',
            ),
            item(
              'Press Escape or cancel a touch gesture during dragging; the previous arrangement should return.',
            ),
            item(
              'Save order, reload and check the notebook, home cards and saved article previews. Automatic numbers follow the visible notebook order.',
            ),
            item(
              'Reset order discards an unsaved arrangement. Leaving with unsaved changes should ask before discarding it.',
            ),
            item(
              'Try two admin tabs. A stale order save should ask you to reload; research text, status and selected-home membership should stay intact.',
            ),
            item(
              'A failed save keeps your arrangement so you can retry. Deleting a note and adding another must not hide remaining cards.',
            ),
          ),
        ),
        section(
          'Portfolio admin palette',
          bullets(
            item(
              'Overview, Homepage, Profile and New note show the blue grid around warm ivory editing panels, navy actions and brass focus and active accents.',
            ),
            item(
              'Active navigation, keyboard focus, checked controls and crop dialogs remain clear on desktop and mobile.',
            ),
            item(
              'Selected green controls and Save buttons keep light, readable labels against their accent backgrounds.',
            ),
            item(
              'Successful saves and published badges remain green; invalid fields and failed saves remain red.',
            ),
            item(
              'The Homepage journey preview shows the card title, description and research lines in the public palette. Saved article previews keep the same reading colours.',
            ),
            item(
              'Choose View site, then return to admin: the public card journey, notebook and article keep their navy, ivory, brass and green palette.',
            ),
            item(
              'At the end of an admin or public page, scroll past the footer and confirm the page stops at the footer edge on desktop and mobile.',
            ),
          ),
        ),
        section(
          'Release and recovery',
          numbers(
            '1',
            item(
              'Review the Release checklist in Admin: profile approval, published research and the production HTTPS address are separate blockers.',
            ),
            item(
              'Run npm run release:check from web/. It reports every blocker without approving or publishing content.',
            ),
            item(
              'Citations remain optional. Samples, including these three notes, stay out of production.',
            ),
            item(
              'Stop the local admin, then run npm run content:backup. Private images, workbooks, content, public files and local trash are included with checksums.',
            ),
            item(
              'Run npm run content:restore -- BACKUP NEW-FOLDER. Restoration requires a new destination and checks every file before writing.',
            ),
            item(
              'Compare restored profile, research, original images and workbooks; do not overwrite live content until you have reviewed the recovery.',
            ),
            item(
              'Corrupted backups, unsafe paths and existing restore folders must be refused. Keep an off-device backup and review a release before deploying.',
            ),
          ),
        ),
        {
          heading: 'Legacy paragraphs and reflection points',
          paragraphs: [
            'This section intentionally uses the original plain-paragraph format. Older research still reads correctly alongside rich sections.',
          ],
          prompts: [
            'Do reflection bullets display their markers?',
            'Does the section remain reachable from the contents links?',
          ],
        },
        section(
          'Reading and navigation',
          bullets(
            item(
              'Reload an existing research editor, New note and Profile with an extension that adds body attributes. Fields should remain editable without a hydration warning; genuine mismatches inside the page should remain visible.',
            ),
            item('Check the home carousel arrows, swiping and every direct research link.'),
            item('Check widths of 320, 390, 768, 1024 and 1440 pixels for overflow.'),
            item('Use the contents links, next-note link and Back to top repeatedly.'),
            item('Read with the keyboard, reduced motion and JavaScript disabled.'),
            item('Check unknown URLs return a 404 and the static export has no admin pages.'),
            item(
              'Sample and draft notes stay out of production builds. These notes remain samples.',
            ),
          ),
        ),
        latest,
      ],
    }),
  ];
}
export async function updateShowcaseNotes({
  root = path.join(process.cwd(), 'src/content'),
  date = [new Date().toISOString().slice(0, 10), '2026-09-28'].sort().at(-1)!,
  change,
}: { root?: string; date?: string; change?: string } = {}) {
  const notes = makeShowcaseNotes(date, change);
  const researchDir = path.join(root, 'research');
  const entries = fs.existsSync(researchDir)
    ? fs
        .readdirSync(researchDir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => ({
          name,
          note: JSON.parse(fs.readFileSync(path.join(researchDir, name), 'utf8')),
        }))
    : [];
  // Refuse collisions or renamed reserved records before writing anything.
  for (const entry of entries) {
    const reserved = notes.find(
      (note) =>
        note.slug + '.json' === entry.name ||
        note.id === entry.note.id ||
        note.slug === entry.note.slug,
    );
    if (
      reserved &&
      (entry.name !== reserved.slug + '.json' ||
        entry.note.id !== reserved.id ||
        entry.note.slug !== reserved.slug ||
        entry.note.category !== 'Showcase' ||
        entry.note.status !== 'sample')
    )
      throw new Error(`Showcase collision: ${entry.name}. Resolve it before updating.`);
  }
  parseResearch([
    ...entries
      .filter((entry) => !notes.some((note) => note.id === entry.note.id))
      .map((entry) => entry.note),
    ...notes,
  ]);
  const imageDir = path.join(root, 'images');
  for (const id of showcaseImageIds)
    for (const suffix of ['.json', '.webp', '.original.webp']) {
      const file = path.join(imageDir, id + suffix);
      if (fs.existsSync(file)) {
        const meta = path.join(imageDir, id + '.json');
        if (
          !fs.existsSync(meta) ||
          JSON.parse(fs.readFileSync(meta, 'utf8')).managedBy !== 'showcase-notes-v1'
        )
          throw new Error(`Showcase image collision: ${id}`);
      }
    }
  const illustrations = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#e7ede6"/><path d="M120 420H840" stroke="#426153" stroke-width="3"/><g fill="#426153"><rect x="180" y="290" width="100" height="130" rx="8"/><rect x="340" y="230" width="100" height="190" rx="8"/><rect x="500" y="180" width="100" height="240" rx="8"/><rect x="660" y="100" width="100" height="320" rx="8"/></g></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640"><rect width="480" height="640" fill="#eee0ce"/><circle cx="240" cy="160" r="72" fill="#ad7258"/><rect x="168" y="272" width="144" height="144" rx="12" fill="#446254"/><path d="M240 455L320 575H160Z" fill="#66818f"/></svg>',
  ];
  const assets = await Promise.all(
    illustrations.map((svg) =>
      sharp(Buffer.from(svg)).webp({ quality: 92 }).toBuffer({ resolveWithObject: true }),
    ),
  );
  fs.mkdirSync(imageDir, { recursive: true });
  fs.mkdirSync(researchDir, { recursive: true });
  for (const [index, asset] of assets.entries()) {
    const id = showcaseImageIds[index];
    fs.writeFileSync(path.join(imageDir, id + '.webp'), asset.data);
    fs.writeFileSync(path.join(imageDir, id + '.original.webp'), asset.data);
    fs.writeFileSync(
      path.join(imageDir, id + '.json'),
      JSON.stringify({
        kind: 'article',
        managedBy: 'showcase-notes-v1',
        width: asset.info.width,
        height: asset.info.height,
      }),
    );
  }
  for (const note of notes) {
    const target = path.join(researchDir, note.slug + '.json');
    const temporary = target + '.showcase-tmp';
    fs.writeFileSync(temporary, JSON.stringify(note, null, 2) + '\n');
    fs.renameSync(temporary, target);
  }
}
