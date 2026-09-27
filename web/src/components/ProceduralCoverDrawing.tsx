import { proceduralDesign } from '@/lib/procedural-cover';
export function ProceduralCoverDrawing({ word, seed }: { word: string; seed: string }) {
  const design = proceduralDesign(word, seed);
  return <g stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" transform={design.transform} data-cover-family={design.family}>
    {design.strokes.map((stroke, index) => <path key={index} d={stroke.d} opacity={stroke.opacity} fill={stroke.fill ? 'currentColor' : 'none'} transform={stroke.transform} />)}
  </g>;
}
