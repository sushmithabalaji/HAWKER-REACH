import type { ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@databricks/appkit-ui/react';

// An ⓘ that opens a short note on click, tap or keyboard (#71): secondary explanations stay off the page
// until asked for.
export function InfoPopover({
  label,
  children,
  className = 'text-muted-foreground hover:text-foreground',
}: {
  label: string;
  children: ReactNode;
  /** Its colours; the default suits a light background. */
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={`rounded-full px-1 align-baseline text-sm font-normal ${className}`}
        >
          ⓘ
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-sm">{children}</PopoverContent>
    </Popover>
  );
}
