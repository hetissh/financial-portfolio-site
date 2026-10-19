// Renders a research note card with its saved cover and notebook number.
import { noteNumber } from '@/lib/research-order';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Research } from '@/lib/content-schema';
import { ResearchArt } from './ResearchArt';
export function ResearchCard({
  item,
  number,
  privatePreview = false,
}: {
  item: Research;
  number: number;
  privatePreview?: boolean;
}) {
  return (
    <article className="research-card">
      <Link className="card-link" href={`/research/${item.slug}/`}>
        <ResearchArt
          theme={item.theme}
          cover={item.cover}
          number={noteNumber(item, number)}
          privatePreview={privatePreview}
        />
        <div className="card-meta">
          <span>{item.category}</span>
          <span>{noteNumber(item, number)}</span>
        </div>
        <h3>
          {item.title}
          <ArrowUpRight size={23} strokeWidth={1.4} aria-hidden="true" />
        </h3>
        <p>{item.summary}</p>
        <div className="card-foot">
          <span>{item.status === 'sample' ? 'Example note' : 'Research note'}</span>
          <span>
            Read the note <span aria-hidden="true">↗</span>
          </span>
        </div>
      </Link>
      {item.cover?.type === 'image' && item.cover.unsplash && (
        <p className="image-credit">
          Photo by{' '}
          <a href={item.cover.unsplash.photographerUrl} target="_blank" rel="noreferrer">
            {item.cover.unsplash.photographer}
          </a>{' '}
          on{' '}
          <a href={item.cover.unsplash.photoUrl} target="_blank" rel="noreferrer">
            Unsplash
          </a>
        </p>
      )}
    </article>
  );
}
