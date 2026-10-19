// Reads and saves the profile through the guarded local admin API.
import { handleWrite, requireVersion } from '@/lib/admin/guard';
import { recordVersion } from '@/lib/admin/store';
import { adminSaveProfile } from '@/lib/admin/data-source';
export function PUT(request: Request) {
  return handleWrite(request, async (body) => {
    const record = await adminSaveProfile(body, requireVersion(request));
    return { ...record, version: recordVersion(record) };
  });
}
