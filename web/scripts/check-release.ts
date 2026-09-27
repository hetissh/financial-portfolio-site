import { loadContent, readResearchFiles } from '../src/lib/content';
import { parseResearch } from '../src/lib/content-schema';
import { releaseReadiness } from '../src/lib/release-readiness';

try {
  // Validate every record and its assets, including drafts; do not change any content.
  process.env.SITE_MODE = 'preview';
  const { profile, research } = loadContent();
  const report = releaseReadiness(profile, parseResearch(readResearchFiles().map(entry => entry.data)), process.env.SITE_URL);
  console.log('Production readiness (read-only)');
  console.log(`Content valid: ${research.length} notes visible in preview.`);
  for (const check of report.checks) console.log(`${check.ok ? 'PASS' : 'BLOCKED'} · ${check.title}: ${check.detail}`);
  for (const notice of report.notices) console.log(`INFO · ${notice}`);
  console.log(report.ready ? 'Content and address are ready. Run the release build and review its artifact before deploying.' : `${report.checks.filter(check => !check.ok).length} items block a production build.`);
  process.exitCode = report.ready ? 0 : 1;
} catch (error) {
  console.error(`Content validation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
