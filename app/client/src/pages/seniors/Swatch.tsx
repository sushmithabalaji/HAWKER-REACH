// A small colour key for Page 2's legends and cards. A thin border keeps the palest colours visible on
// the white card; `ring` draws a coloured outline instead; `dot` is a round key matching the map's block dots.
export function Swatch({
  colour,
  ring,
  square,
  dot,
}: {
  colour: string;
  ring?: string;
  square?: boolean;
  dot?: boolean;
}) {
  if (dot) {
    return (
      <span
        className="inline-block h-3.5 w-3.5 shrink-0 rounded-full"
        style={{ background: colour, boxShadow: '0 0 0 1.5px var(--card), 0 0 0 2.5px var(--border-strong)' }}
      />
    );
  }
  return (
    <span
      className={`inline-block h-3 shrink-0 rounded-sm ${square ? 'w-3' : 'w-4'}`}
      style={{ background: colour, border: ring ? `2px solid ${ring}` : '1px solid rgb(0 0 0 / 0.35)' }}
    />
  );
}
