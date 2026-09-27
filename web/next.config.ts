import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// The local admin (`npm run admin`) edits content files on disk. Its routes use a
// `.admin.tsx`/`.admin.ts` extension, so they only exist on the development server
// with PORTFOLIO_ADMIN=1 and can never be part of the static export. The admin also
// gets its own build directory and tsconfig, so the route types it generates (which
// include /admin) never reach `npm run typecheck` or `next build`.
export default function nextConfig(phase: string): NextConfig {
  const admin = process.env.PORTFOLIO_ADMIN === "1";
  if (admin && phase !== PHASE_DEVELOPMENT_SERVER) throw new Error("PORTFOLIO_ADMIN is only supported by the local development server. Unset it before building.");
  return {
    ...(admin && { distDir: ".next-admin", typescript: { tsconfigPath: "tsconfig.admin.json" } }),
    output: admin ? undefined : "export",
    pageExtensions: admin ? ["admin.tsx", "admin.ts", "tsx", "ts"] : ["tsx", "ts"],
    trailingSlash: true,
    env: { NEXT_PUBLIC_PORTFOLIO_ADMIN: admin ? "1" : "0" },
    images: { unoptimized: true },
    poweredByHeader: false,
  };
}
