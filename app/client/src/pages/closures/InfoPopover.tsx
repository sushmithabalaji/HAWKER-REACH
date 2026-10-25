import type { ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@databricks/appkit-ui/react';

// An ⓘ that opens a short note on click, tap or keyboard (#71): secondary explanations stay off the page
// until asked for.
export function InfoPopover({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="rounded-full px-1 align-baseline text-sm font-normal text-muted-foreground hover:text-foreground"
        >
          ⓘ
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-sm">{children}</PopoverContent>
    </Popover>
  );
}
