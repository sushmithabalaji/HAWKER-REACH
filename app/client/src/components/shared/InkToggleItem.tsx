import type { ComponentProps } from 'react';
import { ToggleGroupItem } from '@databricks/appkit-ui/react';
import { cn } from '@/lib/utils';

// A ToggleGroupItem that is ink with white text when selected, as the wireframe's toggles are.
export function InkToggleItem({ className, ...props }: ComponentProps<typeof ToggleGroupItem>) {
  return (
    <ToggleGroupItem
      className={cn('data-[state=on]:bg-primary data-[state=on]:text-primary-foreground', className)}
      {...props}
    />
  );
}
