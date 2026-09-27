import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve('out');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.pdf': 'application/pdf', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.ico': 'image/x-icon' };
if (!existsSync(path.join(root, 'index.html'))) throw new Error('No static export found. Run npm run build first.');
createServer((request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (!['GET', 'HEAD'].includes(request.method || '')) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400); response.end(); return; }
  const resolved = path.resolve(root, `.${pathname}`);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) { response.writeHead(403); response.end(); return; }
  let file = resolved;
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!pathname.endsWith('/')) { response.writeHead(308, { Location: `${pathname}/${new URL(request.url, 'http://localhost').search}` }); response.end(); return; }
    file = path.join(file, 'index.html');
  }
  let status = 200;
  if (!existsSync(file) || !statSync(file).isFile()) { file = path.join(root, '404.html'); status = 404; }
  if (!existsSync(file)) { response.writeHead(404); response.end('Not found'); return; }
  response.writeHead(status, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  if (request.method === 'HEAD') response.end(); else createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`Portfolio preview: http://127.0.0.1:${port}`));
