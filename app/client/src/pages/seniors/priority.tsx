import { Button } from '@databricks/appkit-ui/react';

// The two pieces What to do and the support list share around usePriorityFilter.
export function NoneUrgent({ areas, className }: { areas: number; className: string }) {
  return (
    <p className={className}>
      No area needs urgent help. {areas} {areas === 1 ? 'area has' : 'areas have'} seniors with a longer walk.
    </p>
  );
}

export function ShowAllToggle({ showAll, areas, onToggle }: { showAll: boolean; areas: number; onToggle: () => void }) {
  return (
    <div>
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onToggle}>
        {showAll ? 'Show priority areas only' : `Show all ${areas} affected areas`}
      </Button>
    </div>
  );
}
