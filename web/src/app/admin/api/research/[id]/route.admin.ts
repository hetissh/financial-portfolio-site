import { handleWrite, requireVersion } from "@/lib/admin/guard";
import { trashResearch, updateResearch } from "@/lib/admin/store";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  return handleWrite(request, (body) => updateResearch(id, body, { expectedVersion: requireVersion(request) }));
}
export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  return handleWrite(request, () => trashResearch(id, { expectedVersion: requireVersion(request) }));
}
