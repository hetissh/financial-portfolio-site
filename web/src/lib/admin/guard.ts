// Request checks for the local admin. The development server binds to 127.0.0.1, but a
// page open in the same browser could still send it requests. Writes must target a local
// host name (blocks DNS rebinding), come from the admin's own origin (blocks cross-site
// requests), and use a JSON body (forces a CORS preflight, which the admin never approves).
import { ContentValidationError, RecordNotFoundError, VersionConflictError } from "./store";

const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
export const adminEnabled = () => process.env.PORTFOLIO_ADMIN === "1";
export function isLocalHost(host: string | null) {
  return Boolean(host) && localHosts.has(host!.replace(/:\d+$/, ""));
}

export function rejectUnsafeRequest(request: Request): Response | undefined {
  if (!adminEnabled()) return Response.json({ message: "Not found" }, { status: 404 });
  const host = request.headers.get("host");
  if (!isLocalHost(host)) return Response.json({ message: "The admin only accepts requests to a local address." }, { status: 403 });
  if (request.headers.get("origin") !== `http://${host}`) return Response.json({ message: "Cross-origin request blocked." }, { status: 403 });
  if (request.method !== "DELETE" && !request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ message: "Send JSON." }, { status: 415 });
  }
}

/** Runs a guarded admin write and converts store errors into JSON responses. */
export function requireVersion(request: Request) {
  const value = request.headers.get('if-match');
  if (!value || !/^"[a-f0-9]{64}"$/.test(value)) throw new VersionConflictError();
  return value.slice(1, -1);
}
async function boundedJson(request: Request) {
  const maximum = 1024 * 1024;
  if (Number(request.headers.get('content-length')) > maximum) throw new RangeError('Request too large');
  const reader = request.body?.getReader(); if (!reader) throw new SyntaxError('Missing body');
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > maximum) { await reader.cancel(); throw new RangeError('Request too large'); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function handleWrite(request: Request, write: (body: unknown) => unknown) {
  const rejected = rejectUnsafeRequest(request);
  if (rejected) return rejected;
  try {
    const body = request.method === "DELETE" ? undefined : await boundedJson(request);
    return Response.json({ record: write(body) });
  } catch (error) {
    if (error instanceof ContentValidationError) return Response.json({ message: "Fix the highlighted fields.", issues: error.issues }, { status: 422 });
    if (error instanceof RecordNotFoundError) return Response.json({ message: error.message }, { status: 404 });
    if (error instanceof VersionConflictError) return Response.json({ message: error.message }, { status: 409 });
    if (error instanceof RangeError) return Response.json({ message: "Content is too large. Keep each save under 1 MB." }, { status: 413 });
    if (error instanceof SyntaxError) return Response.json({ message: "Invalid JSON." }, { status: 400 });
    console.error(error);
    return Response.json({ message: "Could not save. Please try again." }, { status: 500 });
  }
}
