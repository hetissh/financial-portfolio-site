import { noteNumber } from "@/lib/research-order";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Research } from "@/lib/content-schema";
import { ResearchArt } from "./ResearchArt";
export function ResearchCard({ item, number }: { item: Research; number: number }) {
  return <article className="research-card">
    <Link className="card-link" href={`/research/${item.slug}/`}>
      <ResearchArt theme={item.theme} cover={item.cover} number={noteNumber(item, number)} />
      <div className="card-meta"><span>{item.category}</span><span>{noteNumber(item, number)}</span></div>
      <h3>{item.title}<ArrowUpRight size={23} strokeWidth={1.4} aria-hidden="true" /></h3>
      <p>{item.summary}</p>
      <div className="card-foot"><span>{item.status === "sample" ? "Example note" : "Research note"}</span><span>Read the note <span aria-hidden="true">↗</span></span></div>
    </Link>
  </article>;
}
