import type { Metadata } from "next";
import localFont from "next/font/local";
const bodyFont = localFont({
  src: [
    { path: "../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ], variable: "--font-body", display: "swap", adjustFontFallback: "Arial",
});
const editorialFont = localFont({
  src: [
    { path: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ], variable: "--font-editorial", display: "swap", adjustFontFallback: "Times New Roman",
});
import "./globals.css";
import { loadContent } from "@/lib/content";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
export function generateMetadata(): Metadata {
  const { profile, mode } = loadContent();
  const origin = new URL(process.env.SITE_URL || "http://127.0.0.1:4173");
  return {
    metadataBase: origin,
    title: { default: `${profile.displayName} — Finance & research`, template: `%s — ${profile.displayName}` },
    description: profile.intro,
    robots: { index: mode === "production", follow: mode === "production" },
    icons: { icon: "/favicon.svg" },
    openGraph: { title: `${profile.displayName} — Finance & research`, description: profile.intro, type: "website", images: [{ url: "/social.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: ["/social.png"] },
  };
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { profile, mode } = loadContent();
  // Browser extensions can add body attributes before React starts (e.g. cz-shortcut-listen).
  // Tolerate attributes on this element only; descendant mismatches remain visible.
  return <html lang="en" className={`${bodyFont.variable} ${editorialFont.variable}`}><body suppressHydrationWarning><a href="#main" className="skip-link">Skip to content</a><SiteHeader profile={profile} preview={mode === "preview"} />{children}<SiteFooter name={profile.displayName} /></body></html>;
}
