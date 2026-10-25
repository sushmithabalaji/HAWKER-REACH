import { useState } from 'react';
import { Button } from '@databricks/appkit-ui/react';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { Pill } from '@/components/shared/Pill';
import { TagBadge } from '@/components/shared/TagBadge';
import { roughCount, type AreaCutOff } from './scenario';
import { LIMIT_MIN, SUPER_AGED_SHARE } from './settings';
import type { SubzoneSeniors } from './subzoneSeniors';
import type { Names } from './names';

interface AreasToAlertProps {
  areas: AreaCutOff[];
  subzoneSeniors: Map<string, SubzoneSeniors>;
  priorityIds: ReadonlySet<string>;
  names: Names;
}

const SUPER_AGED_PCT = Math.round(SUPER_AGED_SHARE * 100);

// Subzones whose AAC should check in, most seniors cut off first. Only priority areas show until the user
// asks for all of them (ASSUMPTIONS.md, priority areas). The super-aged badge is shown beside the count,
// never multiplied into it (ASSUMPTIONS.md, Areas to alert).
export function AreasToAlert({ areas, subzoneSeniors, priorityIds, names }: AreasToAlertProps) {
  const [showAll, setShowAll] = useState(false);
  const priority = areas.filter((a) => priorityIds.has(a.subzone_id));
  const others = areas.length - priority.length;
  const shown = showAll ? areas : priority;
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Areas to alert</PanelTitle>
        <p className="text-xs text-muted-foreground">
          Where no one can walk to a centre, or {SUPER_AGED_PCT}%+ of residents are 65+.
        </p>
      </PanelHeader>
      <PanelContent>
        {areas.length === 0 && (
          <p className="text-sm text-muted-foreground">No senior loses a {LIMIT_MIN}-min walk, so no area to alert.</p>
        )}
        {areas.length > 0 && priority.length === 0 && !showAll && (
          <p className="text-sm text-muted-foreground">
            No area needs urgent help. {areas.length} {areas.length === 1 ? 'area has' : 'areas have'} seniors with a
            longer walk.
          </p>
        )}
        {shown.length > 0 && (
          <ul className="flex flex-col divide-y">
            {shown.map((a) => {
              const s = subzoneSeniors.get(a.subzone_id);
              return (
                <li
                  key={a.subzone_id}
                  className={`flex items-start gap-3 py-2 text-sm ${priorityIds.has(a.subzone_id) ? '' : 'opacity-60'}`}
                >
                  <span className="flex-1">
                    <strong>{names.subzone(a.subzone_id)}</strong>
                    {a.noOneCanWalk && (
                      <span className="ml-2">
                        <Pill tone="highlight">No one can walk to a centre</Pill>
                      </span>
                    )}
                    {s?.is_super_aged && (
                      <span className="ml-2">
                        <Pill tone="highlight">⚠ {SUPER_AGED_PCT}%+ aged 65+</Pill>
                      </span>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {s?.pct_65p != null ? (
                        <>
                          {Math.round(s.pct_65p * 100)}% aged 65+ <TagBadge tag="MEASURED" />
                        </>
                      ) : (
                        'too few residents for a share aged 65+'
                      )}
                      {' · '}
                      {a.blocks} {a.blocks === 1 ? 'block' : 'blocks'} <TagBadge tag="MODELLED" />
                    </span>
                  </span>
                  <span className="text-right font-mono text-highlight">
                    {roughCount(a.seniors)}
                    <TagBadge tag="MODELLED" />
                    <span className="block font-sans text-xs text-muted-foreground">seniors</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {others > 0 && (
          <div>
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show priority areas only' : `Show all ${areas.length} affected areas`}
            </Button>
          </div>
        )}
      </PanelContent>
    </Panel>
  );
}
