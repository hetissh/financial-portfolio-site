# Financial Portfolio Site

A responsive finance/research portfolio built with Next.js, React, TypeScript, and static export.

Project: `/Users/hetissh/Workspace/personal_projects/financial-portfolio-site/`

## Run locally

```sh
cd /Users/hetissh/Workspace/personal_projects/financial-portfolio-site/web
nvm install
nvm use
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). If you use a different Node manager, install the version in `web/.nvmrc` first. Dependencies are pinned in the lockfile.

To inspect the generated static site:

```sh
npm run build
npm run preview
```

Open [127.0.0.1:4173](http://127.0.0.1:4173). The preview server binds only to this machine. `PORT=4174 npm run preview` selects another port.

## What's implemented

- Home with desktop two-column composition and stacked mobile layout.
- Selected-research rail with native swipe, keyboard access, and arrow controls.
- Research index, individual reading pages, source links, and a real 404 page.
- Explicit Back to top scrolling on every activation, keyboard focus restoration, and reduced-motion support.
- Self-hosted fonts, local illustrations, generated social image, and page metadata.
- Validated content, draft exclusion, preview/production modes, and automated checks.
- Local admin for profile/research editing, reset, validation, conflict-safe saves, and trash recovery.
- Research spreadsheet attachments with inline Google Sheets/Excel embeds, an expanded reader, and local Excel previews/downloads.

The current preview contains three clearly labeled **example notes** and editable profile defaults. No résumé or contact details were supplied, so those links are omitted. The original ChatGPT page was not available: this is a new design based on the confirmed responsive and interaction requirements.

## Open the local admin

From `web/`, run:

```sh
npm run admin
```

Open [127.0.0.1:3000/admin](http://127.0.0.1:3000/admin/). The local site's footer also has an Admin link. `npm run admin -- --port 3100` uses port 3100 instead.

The admin runs on your own machine. It edits the same JSON content used by the static build; it is deliberately excluded from the exported site. The static preview on port 4173 has no admin routes. Stop the admin before running a release build.

You can edit profile/contact details, create research, reorder sections, preview drafts, publish notes, and move notes to `.admin-trash/`. Reset edits restores the last saved version. Unsaved edits prompt before navigating through links or closing the tab. Saves from an older tab are rejected so they cannot overwrite newer edits; reload to review the saved version.

### Arrange cards and number notes

On the admin Overview, drag a card's handle to arrange the notebook, then click **Save order**. On mobile, drag the same handle. Arrow buttons and keyboard arrow keys are available too; Home/End move a focused handle to the first/last position. Escape cancels a drag and **Reset order** discards an unsaved arrangement. Older tabs cannot overwrite a newer saved order.

Every cover shows **FIELD NOTES / 01**, **02**, etc., following the visible notebook order. The same note keeps its number on the home rail, archive and article. Artwork type labels are omitted. In a note's Cover section, leave **Note number** empty for automatic numbering, or enter a whole number from 1 to 9999 to override it. The main cover word and colour remain editable. In Publishing, **Show on home page** selects notes for the home rail; the saved notebook order also arranges those selected cards. If no visible notes are selected, the home rail shows all visible notes.

The arrangement is stored in `web/src/content/research-order.json` when you save it. Keep this file with content backups. Rebuild the static preview after saving an arrangement or changing a note number.

### Choose and customise card artwork

Open a research editor and select **Cover** in the editor shortcuts. The **Cover artwork** section offers:

- **Theme artwork:** the three original illustrations plus ten fixed geometric designs. Each has a default word and colour. Choose a thumbnail, then edit **Cover word** and **Cover colour**; the preview updates immediately while the fixed shape stays the same.
- **Hero Patterns:** a separate catalogue of 87 patterns by Steve Schoger. All 87 patterns are shown by default; search by name to filter them. Every pattern has a default word and background colour. After choosing, customise its word, foreground colour, background colour and foreground opacity. The preview updates immediately, and these settings persist when you save the note. These SVG patterns are bundled locally; no API key or network request is needed. Attribution is included in the picker and site footer; see [third-party notices](web/THIRD_PARTY_NOTICES.md).
- **Import image:** upload a JPEG, PNG or WebP up to 10 MB and 40 megapixels. Drag, zoom, or use position sliders to choose the crop. **Use this crop** applies it to the preview; **Adjust image crop** reopens the original. Cancelling preserves the current cover. Image covers start with “Image” and a neutral caption colour; both remain editable.

Click **Save changes** to keep the cover on the home card, research index and article. **Reset edits** returns to the last saved cover. Existing saved covers keep their appearance.

**Generate geometric variations** still offers the seeded generator: **Generate cover** and **Try another variation** create fresh designs using the word and colour above. Saved seeds remain stable across reloads and builds. Colours choose readable black or white artwork automatically.

Imported originals and crop metadata are stored privately in `web/src/content/images/`. Builds regenerate `public/images/covers/` with only cropped images used by visible notes. Draft images, originals and unattached uploads are excluded. Production also excludes sample covers. Keep the private source folder with your content backups so crops can be adjusted later. Image crops use the same 1.55 aspect ratio on cards and articles.

### Research sheets

Open a research editor and use the **Sheets & models** shortcut:

- Upload an `.xlsx` workbook up to 5 MB. The viewer offers sheet selection, cached values, formulas, and a download of the original workbook. It does not recalculate Excel formulas. Save your workbook in Excel before uploading.
- Attach a Google Sheets sharing link, and optionally its published embed link. Published sheets appear inline with Expand and Open original; ordinary sharing links stay available as external links. Access follows the provider’s settings.
- Attach an Excel embed from OneDrive or SharePoint, or add a hosted embed link to an uploaded workbook. The hosted viewer appears inline, while the uploaded original remains downloadable.
- Save the note after adding, renaming, or removing an attachment. Drafts can be previewed from the admin.

To embed Google Sheets, use **File → Share → Publish to web → Embed**. Paste its `/pubhtml` URL or iframe code into **Google Sheets embed URL or code**, click **Preview Google embed**, then **Attach Google Sheet** and save the note. A sharing link is optional when the published embed is supplied. Choose only the tabs/range intended for visitors. Published sheets preserve provider formatting but are read-only and omit formulas and the editing toolbar. A published `/pubhtml` link entered directly as the sharing link is also embedded automatically.

For Excel, host the workbook on **OneDrive or SharePoint** and generate its embed code. Use **Embed an Excel workbook** to attach it, or fill an existing uploaded attachment’s **embed URL or code**. Paste the generated OneDrive `/embed` URL, or a SharePoint Excel URL with `action=embedview`; preview and save. An optional **original workbook link** is used by Open original. The app does not upload files to Microsoft. If an upload has no hosted embed, its existing local preview remains; clear an optional embed URL to restore it.

The **Expand** button promotes the same iframe to a large reader, preserving its selected sheet and scroll position. **Close** returns to the note and restores focus. On mobile, the reader fills the screen. **Reload** retries the provider frame, and **Open original** is always available for sign-in/access issues. Escape closes the reader while a parent-page control has focus; when the provider iframe has keyboard focus, use its surrounding Close button. Inline frames and original links are also present in HTML without JavaScript.

Only Google Sheets and generated OneDrive/SharePoint embed URLs are accepted. Pasted iframe code is reduced to its validated source URL; no pasted scripts, styles or HTML are inserted. Provider viewer appearance and controls cannot be restyled by this site. Test the hosted workbook in a private browser as a visitor before release; tenant restrictions, sharing settings and third-party browser policies can affect access. No existing note or sheet is made public automatically.

Provider references: [Google publishing and embedding](https://support.google.com/docs/answer/183965?hl=en), [OneDrive embedding](https://support.microsoft.com/en-us/excel/share-it-embed-an-excel-workbook-on-your-web-page-or-blog-from-onedrive), [SharePoint embedding](https://support.microsoft.com/en-us/excel/embed-your-excel-workbook-on-your-web-page-or-blog-from-sharepoint-or-onedrive-for-business).

Workbooks are stored in `web/src/content/workbooks/`. A build copies only workbooks attached to visible notes into `public/downloads/workbooks/`, a directory reserved for the generator. Production excludes draft and sample notes and their workbook downloads. Removed/unattached source workbooks are kept locally for recovery and never exported.

The **Beyond the bottom line** example includes a clearly labelled demonstration workbook with fictional figures. Replace it with your actual research before publishing.

Edits appear on the admin server immediately. To update the static preview on port 4173, run `npm run build` again. Publishing a note in the editor does not deploy a website.

## Edit the content

Change `web/src/content/profile.json` for name, headline, biography, and contact links. Each contact link has a `label` and an HTTPS or `mailto:` `href`. Optional `resume` points to a file in `web/public/`, for example `/downloads/resume.pdf`.

Research lives in `web/src/content/research/*.json`. Use one record per note, with a unique `id` and `slug`, a summary, body sections, and optional source links. Citations are optional for published notes and production releases. An optional `download` uses a local public-file path. Three statuses are supported:

| Status | Preview build | Production build |
| --- | --- | --- |
| `draft` | Excluded | Excluded |
| `sample` | Visible with example labels | Excluded |
| `published` | Visible | Visible |

A note's `theme` is `forest`, `clay`, or `blue`. `featuredOrder` marks selection for the home rail and supplies the original sorting fallback until an arrangement is saved. The saved `research-order.json` arrangement takes precedence. If no visible records have `featuredOrder`, the home shows all visible notes. Optional `noteNumber` overrides the automatic cover number. Dates use `YYYY-MM-DD`.

After editing, run `npm run validate:content` and build again. Save the `src/content` folder, including workbook files, in your backups. Invalid dates, duplicate slugs, unsafe URLs, and missing local downloads stop the build. Research rendering escapes text rather than injecting HTML.

## Quality checks

Run from `web/`:

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run build
npx playwright install
npm run test:e2e
npm run test:e2e:admin
```

Public browser checks run against the static export on an isolated port (4187 by default). Admin checks start a separate server on port 4186 and edit temporary copies of the content. They cover Chromium, Firefox, WebKit, and mobile profiles. The test dataset currently uses the included example notes; update content-specific expectations alongside any changes to those fixtures. See [admin and sheets QA](docs/qa-evidence/ADMIN_REVIEW.md) for admin/sheets results and remaining manual checks. [Word-cover QA](docs/qa-evidence/WORD_COVERS.md) records the initial cover checks. [Artwork picker QA](docs/qa-evidence/ARTWORK_PICKER.md) records theme, pattern and crop checks. [Continuous-cover QA](docs/qa-evidence/PROCEDURAL_COVERS.md) records the expanded generator checks. [Original site QA](docs/qa-evidence/RESULTS.md) records the earlier public-site checks.

`PLAYWRIGHT_CHROMIUM_EXECUTABLE` optionally selects an existing Chromium binary. `PLAYWRIGHT_BROWSERS_PATH` optionally selects a browser cache. Neither is required for normal use after `npx playwright install`.

A GitHub Actions workflow is provided in `.github/workflows/ci.yml`. It runs checks and saves the browser report when this project is pushed to a GitHub repository; no remote was created or connected by this implementation.

## Release

Read [release and rollback instructions](docs/release.md). A production build requires an approved profile, at least one published research item, and a real HTTPS `SITE_URL`. Preview builds are marked `noindex` and include example labels. No website has been publicly deployed.

The initial specification and checklist remain in [the build plan](plans/BUILD_PLAN.md) and [acceptance checklist](plans/ACCEPTANCE.md). Implementation decisions are recorded in [decisions](docs/decisions.md).

### Local launch tools

From `web/`, `npm run release:check` reports all content/address blockers without changing files. The admin Release panel shares those checks. `npm run content:backup` creates and verifies a snapshot of private content, public assets and local trash. `npm run content:restore -- BACKUP NEW-FOLDER` verifies every checksum and restores into a new folder without overwriting your project. See [release and recovery](docs/release.md) for commands and limitations. Deployment and publication still require the owner's reviewed content and chosen host/domain.
