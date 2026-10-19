// Separates the static public export from the loopback-only admin server.
import type { NextConfig } from 'next';

// The local admin (`npm run admin`) edits content files on disk. Its routes use a
// `.admin.tsx`/`.admin.ts` extension, so they exist only with PORTFOLIO_ADMIN=1
// and can never be part of the static export. The admin also
// gets its own build directory and tsconfig, so the route types it generates (which
// include /admin) never reach `npm run typecheck` or `next build`.
export default function nextConfig(): NextConfig {
  const admin = process.env.PORTFOLIO_ADMIN === '1';
  const cloud = process.env.PORTFOLIO_DATA_SOURCE === 'supabase';
  return {
    ...(admin && { distDir: '.next-admin', typescript: { tsconfigPath: 'tsconfig.admin.json' } }),
    output: admin || cloud ? undefined : 'export',
    pageExtensions: admin ? ['admin.tsx', 'admin.ts', 'tsx', 'ts'] : ['tsx', 'ts'],
    trailingSlash: true,
    env: {
      NEXT_PUBLIC_PORTFOLIO_ADMIN: admin ? '1' : '0',
      NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE: cloud ? 'supabase' : 'file',
      NEXT_PUBLIC_SUPABASE_URL: cloud ? (process.env.SUPABASE_URL ?? '') : '',
    },
    images: { unoptimized: true },
    poweredByHeader: false,
  };
}
