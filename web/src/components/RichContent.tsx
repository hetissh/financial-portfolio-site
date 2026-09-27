import Image from 'next/image';
import { articleImageId, safeRichLink, type RichNode } from '@/lib/rich-content';

function ArticleImage({ node }: { node: RichNode }) {
  const attrs = node.attrs!, id = articleImageId(attrs.src)!;
  const src = process.env.PORTFOLIO_ADMIN === '1' ? `/admin/api/images/${id}/` : String(attrs.src);
  const image = <Image src={src} alt={String(attrs.alt)} width={Number(attrs.width)} height={Number(attrs.height)} unoptimized />;
  return <figure className="article-image" style={{ width: `${attrs.displayWidth}%` }}>{image}{Boolean(attrs.caption) && <figcaption>{String(attrs.caption)}</figcaption>}</figure>;
}
function TextBlocks({ node, tag: Tag }: { node: RichNode; tag: 'p' | 'h3' | 'h4' }) {
  // Images embedded in paragraphs or headings become centered figures. Text
  // stays in reading order and figures never create invalid heading/paragraph HTML.
  const parts: React.ReactNode[] = [];
  let run: RichNode[] = [];
  const flush = () => {
    if (!run.length) return;
    parts.push(<Tag key={parts.length}>{run.map((child, index) => <RichContent node={child} key={index} />)}</Tag>);
    run = [];
  };
  for (const child of node.content ?? []) {
    if (child.type === 'image') { flush(); parts.push(<ArticleImage node={child} key={parts.length} />); }
    else run.push(child);
  }
  flush();
  return parts.length ? <>{parts}</> : <Tag />;
}
export function RichContent({ node }: { node: RichNode }) {
  const children = node.content?.map((child, index) => <RichContent node={child} key={index} />);
  switch (node.type) {
    case 'doc': return <>{children}</>;
    case 'text': {
      let text: React.ReactNode = node.text;
      for (const [index, mark] of (node.marks ?? []).entries()) {
        if (mark.type === 'bold') text = <strong key={index}>{text}</strong>;
        if (mark.type === 'italic') text = <em key={index}>{text}</em>;
        if (mark.type === 'link' && safeRichLink(mark.attrs?.href)) text = <a key={index} href={mark.attrs!.href}>{text}</a>;
      }
      return <>{text}</>;
    }
    case 'paragraph': return <TextBlocks node={node} tag="p" />;
    case 'heading': return <TextBlocks node={node} tag={node.attrs?.level === 4 ? 'h4' : 'h3'} />;
    case 'bulletList': return <ul>{children}</ul>;
    case 'orderedList': return <ol data-list-style={node.attrs?.type === 'a' ? 'lower-alpha' : node.attrs?.type === 'A' ? 'upper-alpha' : 'decimal'} start={Number(node.attrs?.start ?? 1)} type={(node.attrs?.type ?? '1') as '1' | 'a' | 'A'}>{children}</ol>;
    case 'listItem': return <li>{children}</li>;
    case 'hardBreak': return <br />;
    case 'image': return <ArticleImage node={node} />;
    default: return null;
  }
}
