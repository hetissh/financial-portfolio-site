// Lists and creates research notes through the guarded local admin API.
import { handleWrite } from '@/lib/admin/guard';
import { adminCreateResearch } from '@/lib/admin/data-source';

export function POST(request: Request) {
  return handleWrite(request, (body) => adminCreateResearch(body));
}
