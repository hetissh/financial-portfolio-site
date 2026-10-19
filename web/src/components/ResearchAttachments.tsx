// Presents downloadable workbooks and hosted spreadsheet attachments.
import { FileSpreadsheet, ArrowDown, ArrowUpRight } from 'lucide-react';
import type { Attachment } from '@/lib/content-schema';
import { getWorkbook } from '@/lib/admin/workbooks';
import { WorkbookViewer } from './WorkbookViewer';
import { SheetEmbed } from './SheetEmbed';
import { sheetEmbed } from '@/lib/sheet-embed';
import { visitorAssetUrl } from '@/lib/supabase/assets';
import { getCloudWorkbook } from '@/lib/supabase/workbooks';
export async function ResearchAttachments({ attachments }: { attachments: Attachment[] }) {
  if (!attachments.length) return null;
  const localAdmin = process.env.PORTFOLIO_ADMIN === '1';
  const cloud = process.env.PORTFOLIO_DATA_SOURCE === 'supabase';
  const previews = new Map(
    cloud
      ? await Promise.all(
          attachments
            .filter((item) => item.kind === 'excel')
            .map(async (item) => [item.id, await getCloudWorkbook(item.id)] as const),
        )
      : [],
  );
  return (
    <section className="research-attachments" aria-labelledby="sheets-heading" id="sheets">
      <div className="section-heading">
        <div>
          <span className="eyebrow">BEHIND THE RESEARCH</span>
          <h2 id="sheets-heading">
            Sheets &amp; <em>models.</em>
          </h2>
        </div>
        <FileSpreadsheet size={28} aria-hidden="true" />
      </div>
      {attachments.map((attachment) => {
        const embed = sheetEmbed(attachment);
        if (embed)
          return (
            <div className="sheet-embed-attachment" key={attachment.id}>
              <SheetEmbed label={attachment.label} {...embed} />
              {attachment.kind === 'excel' && (
                <p className="sheet-embed-download">
                  <a
                    className="text-link"
                    href={
                      process.env.PORTFOLIO_DATA_SOURCE === 'supabase'
                        ? visitorAssetUrl(`/downloads/workbooks/${attachment.id}.xlsx`)
                        : localAdmin
                          ? `/media/workbooks/${attachment.id}/`
                          : `/downloads/workbooks/${attachment.id}.xlsx`
                    }
                    download
                  >
                    <ArrowDown size={16} aria-hidden="true" /> Download uploaded Excel
                  </a>
                </p>
              )}
            </div>
          );
        if (attachment.kind === 'google')
          return (
            <div className="sheet-link-card" key={attachment.id}>
              <div>
                <span className="eyebrow">GOOGLE SHEETS</span>
                <h3>{attachment.label}</h3>
                <p>Opens in Google Sheets. Access follows the owner’s sharing settings.</p>
              </div>
              <a
                className="button-secondary"
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open sheet <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
          );
        if (attachment.kind === 'microsoft') return null;
        const workbook = cloud ? previews.get(attachment.id) : getWorkbook(attachment.id);
        return (
          <details className="workbook-card" key={attachment.id}>
            <summary>
              <FileSpreadsheet size={19} aria-hidden="true" />
              <span>
                {attachment.label}
                <small>Excel workbook · {workbook?.preview.sheets.length ?? 0} sheets</small>
              </span>
              <span className="preview-prompt">View sheets</span>
            </summary>
            <div className="workbook-content">
              {workbook ? (
                <>
                  <div className="workbook-download">
                    <a
                      className="text-link"
                      href={
                        process.env.PORTFOLIO_DATA_SOURCE === 'supabase'
                          ? visitorAssetUrl(`/downloads/workbooks/${attachment.id}.xlsx`)
                          : localAdmin
                            ? `/media/workbooks/${attachment.id}/`
                            : `/downloads/workbooks/${attachment.id}.xlsx`
                      }
                      download
                    >
                      <ArrowDown size={16} aria-hidden="true" /> Download Excel
                    </a>
                  </div>
                  <WorkbookViewer preview={workbook.preview} label={attachment.label} />
                </>
              ) : (
                <p>This workbook is temporarily unavailable.</p>
              )}
            </div>
          </details>
        );
      })}
    </section>
  );
}
