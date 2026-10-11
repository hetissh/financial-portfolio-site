/** Only known input failures are returned to the browser; filesystem and parser
 * errors stay on the local server. */
export class UploadInputError extends Error {}

export function uploadErrorResponse(error: unknown, fallback: string) {
  if (error instanceof UploadInputError) {
    return Response.json({ message: error.message }, { status: 400 });
  }
  console.error('Admin upload failed:', error);
  return Response.json({ message: fallback }, { status: 500 });
}
