// Reads, updates, and trashes one research note with version checks.
import { handleWrite, requireVersion } from '@/lib/admin/guard';
import { adminFromRequestAsync } from '@/lib/admin/auth';
import { adminTrashResearch, adminUpdateResearch } from '@/lib/admin/data-source';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  return handleWrite(request, (body) => adminUpdateResearch(id, body, requireVersion(request)));
}
export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  return handleWrite(request, async () => {
    const admin = await adminFromRequestAsync(request);
    if (!admin) throw new Error('Admin session ended.');
    return adminTrashResearch(id, requireVersion(request), admin.id);
  });
}
