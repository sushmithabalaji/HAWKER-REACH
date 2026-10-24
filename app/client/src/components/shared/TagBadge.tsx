import type { Tag } from '@shared/tags';

// Colours from the wireframe's tags; each meets WCAG AA on its own background.
const STYLE: Record<Tag, string> = {
  MEASURED: 'bg-tag-measured-bg text-tag-measured',
  MODELLED: 'bg-tag-modelled-bg text-tag-modelled',
  ASSUMPTION: 'bg-tag-assumption-bg text-tag-assumption',
};

export function TagBadge({ tag }: { tag: Tag }) {
  return (
    <span
      className={`ml-1 inline-block whitespace-nowrap rounded-[3px] px-1.5 py-px align-[2px] font-mono text-[10px] font-bold leading-normal tracking-wide ${STYLE[tag]}`}
    >
      {tag}
    </span>
  );
}
