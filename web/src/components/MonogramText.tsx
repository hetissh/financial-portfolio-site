// Scale initials with the badge and leave room for three wide letters.
export function MonogramText({ value }: { value: string }) {
  const count = Array.from(value).length;
  return <svg className="monogram-text" viewBox="0 0 42 44" aria-hidden="true" focusable="false">
    <text x="21" y="22" textAnchor="middle" dominantBaseline="central" fontSize={count >= 3 ? 19 : count === 2 ? 26 : 29} textLength={count > 1 ? 28 : undefined} lengthAdjust="spacingAndGlyphs">{value}</text>
  </svg>;
}
