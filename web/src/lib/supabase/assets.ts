// Resolves approved visitor asset paths to the public Storage bucket in cloud mode.
import { runtimeSetting } from '@/lib/runtime-env';

export function visitorAssetUrl(path: string) {
  if (runtimeSetting('PORTFOLIO_DATA_SOURCE') !== 'supabase') return path;
  if (!/^\/(?!\/)[a-zA-Z0-9_./-]+$/.test(path) || path.split('/').includes('..'))
    throw new Error('Invalid public asset path.');
  const managedImage = /^\/images\/(?:covers|articles)\/([0-9a-f-]{36})\.webp$/.exec(path);
  if (managedImage) return `/media/images/${managedImage[1]}/`;
  const workbook = /^\/downloads\/workbooks\/([0-9a-f-]{36})\.xlsx$/.exec(path);
  if (workbook) return `/media/workbooks/${workbook[1]}/`;
  const resume = /^\/downloads\/resumes\/([0-9a-f-]{36})\.pdf$/.exec(path);
  if (resume) return `/media/credentials/resume/${resume[1]}/`;
  const certification = /^\/downloads\/certifications\/([0-9a-f-]{36})\.pdf$/.exec(path);
  if (certification) return `/media/credentials/certification/${certification[1]}/`;
  const base = runtimeSetting('SUPABASE_URL');
  if (!base) throw new Error('SUPABASE_URL is required for cloud media.');
  const origin = new URL(base);
  if (origin.origin !== base || (origin.protocol !== 'https:' && origin.hostname !== 'localhost'))
    throw new Error('SUPABASE_URL must be an HTTPS origin.');
  return new URL(`/storage/v1/object/public/portfolio-public${path}`, origin).href;
}
