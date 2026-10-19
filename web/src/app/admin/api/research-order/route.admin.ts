// Saves notebook order only when the caller has the current version.
import { handleWrite, requireVersion } from '@/lib/admin/guard';
import { adminReorderResearch } from '@/lib/admin/data-source';

export async function PUT(request: Request) {
  return handleWrite(request, (body) => adminReorderResearch(body, requireVersion(request)));
}
