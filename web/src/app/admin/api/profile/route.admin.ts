import { handleWrite, requireVersion } from "@/lib/admin/guard";
import { recordVersion, saveProfile } from "@/lib/admin/store";
export function PUT(request: Request) {
  return handleWrite(request, (body) => { const record = saveProfile(body, { expectedVersion: requireVersion(request) }); return { ...record, version: recordVersion(record) }; });
}
