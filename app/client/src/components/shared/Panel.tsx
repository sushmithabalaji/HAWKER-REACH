import type { ComponentProps } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@databricks/appkit-ui/react';
import { cn } from '@/lib/utils';

// The wireframe's card: white, 1px border, 12px corners, 14–18px padding and no shadow. Every section
// on a page is one of these, so the pages share one look (#41).
export function Panel({ className, ...props }: ComponentProps<typeof Card>) {
  return <Card className={cn('gap-3 py-3.5 shadow-none', className)} {...props} />;
}

export function PanelHeader({ className, ...props }: ComponentProps<typeof CardHeader>) {
  return <CardHeader className={cn('gap-1 px-panel', className)} {...props} />;
}

export function PanelTitle({ className, ...props }: ComponentProps<typeof CardTitle>) {
  return <CardTitle className={cn('text-base font-bold leading-snug', className)} {...props} />;
}

export function PanelContent({ className, ...props }: ComponentProps<typeof CardContent>) {
  return <CardContent className={cn('flex flex-col gap-3 px-panel', className)} {...props} />;
}
