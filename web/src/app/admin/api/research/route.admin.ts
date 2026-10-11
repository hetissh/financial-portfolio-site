// Lists and creates research notes through the guarded local admin API.
import { handleWrite } from '@/lib/admin/guard';
import { createResearch } from '@/lib/admin/store';

export function POST(request: Request) {
  return handleWrite(request, (body) => createResearch(body));
}
