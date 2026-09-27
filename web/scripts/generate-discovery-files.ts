import { writeFileSync, existsSync, unlinkSync } from "node:fs";
import { loadContent } from "../src/lib/content";
const { mode, research } = loadContent();
if (mode === "production") {
  const origin = new URL(process.env.SITE_URL!).origin;
  const routes = ["/", "/research/", ...research.map((item) => `/research/${item.slug}/`)];
  writeFileSync("public/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${origin}${route}</loc></url>`).join("")}</urlset>\n`);
  writeFileSync("public/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
} else {
  writeFileSync("public/robots.txt", "User-agent: *\nDisallow: /\n");
  if (existsSync("public/sitemap.xml")) unlinkSync("public/sitemap.xml");
}
