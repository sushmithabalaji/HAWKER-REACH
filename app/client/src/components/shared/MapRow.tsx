import type { ReactNode } from 'react';

// The map card beside a side column, as on both wireframe pages: the map takes up to 816px and the
// column at least 340px, and the column wraps below the map on narrow screens.
export function MapRow({ map, side }: { map: ReactNode; side: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-[18px]">
      <div className="min-w-0 flex-[0_1_816px]">{map}</div>
      <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5">{side}</aside>
    </div>
  );
}
