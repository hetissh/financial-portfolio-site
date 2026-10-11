// Saves notebook order only when the caller has the current version.
import { handleWrite, requireVersion } from '@/lib/admin/guard';
import { reorderResearch } from '@/lib/admin/store';

export async function PUT(request: Request) {
  return handleWrite(request, (body) =>
    reorderResearch(body, { expectedVersion: requireVersion(request) }),
  );
}
