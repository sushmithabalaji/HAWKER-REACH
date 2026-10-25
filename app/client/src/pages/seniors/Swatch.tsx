// A small colour key for Page 2's legends and cards. A thin border keeps the palest colours visible on
// the white card; `ring` draws a coloured outline instead.
export function Swatch({ colour, ring, square }: { colour: string; ring?: string; square?: boolean }) {
  return (
    <span
      className={`inline-block h-3 shrink-0 rounded-sm ${square ? 'w-3' : 'w-4'}`}
      style={{ background: colour, border: ring ? `2px solid ${ring}` : '1px solid rgb(0 0 0 / 0.35)' }}
    />
  );
}
