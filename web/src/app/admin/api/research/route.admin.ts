import { handleWrite } from "@/lib/admin/guard";
import { createResearch } from "@/lib/admin/store";

export function POST(request: Request) {
  return handleWrite(request, (body) => createResearch(body));
}
