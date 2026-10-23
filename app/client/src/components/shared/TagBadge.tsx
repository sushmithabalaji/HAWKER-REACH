import { Badge } from '@databricks/appkit-ui/react';
import type { Tag } from '@shared/tags';

const VARIANT = { MEASURED: 'default', MODELLED: 'secondary', ASSUMPTION: 'outline' } as const;

export function TagBadge({ tag }: { tag: Tag }) {
  return (
    <Badge variant={VARIANT[tag]} className="ml-1 align-middle text-[10px] tracking-wide">
      {tag}
    </Badge>
  );
}
