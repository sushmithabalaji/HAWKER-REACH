import { Button } from '@databricks/appkit-ui/react';
import { TOP_AREAS } from './support';

// The support list's toggle between its top areas and every affected area.
export function ShowAllToggle({ showAll, areas, onToggle }: { showAll: boolean; areas: number; onToggle: () => void }) {
  return (
    <div>
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onToggle}>
        {showAll ? `Show the top ${TOP_AREAS} only` : `Show all ${areas} affected areas`}
      </Button>
    </div>
  );
}
