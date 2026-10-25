import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { Pill } from '@/components/shared/Pill';
import { TagBadge } from '@/components/shared/TagBadge';
import { roughCount, type AreaCutOff } from './scenario';
import { NoneUrgent } from './priority';
import { usePriorityFilter } from './usePriorityFilter';
import { LIMIT_MIN, SUPER_AGED_PCT } from './settings';
import type { SubzoneSeniors } from './subzoneSeniors';
import type { Names } from './names';
import type { SupportNeed } from './support';
import { AreaSupports } from './SupportPills';

interface WhatToDoProps {
  areas: AreaCutOff[];
  subzoneSeniors: Map<string, SubzoneSeniors>;
  priorityIds: ReadonlySet<string> | null;
  supportsBySubzone: ReadonlyMap<string, SupportNeed[]>;
  names: Names;
}

// The first few areas; the rest are in the support list below.
const TOP_AREAS = 5;

// "What to do", the last card of the right-hand column: the first priority areas, most seniors cut off first,
// each with the support it needs (ASSUMPTIONS.md, priority areas). Every other area, and the show-all toggle,
// is in the support list below. The super-aged badge is shown beside the count, never multiplied into it
// (ASSUMPTIONS.md, Areas to alert).
export function WhatToDo({ areas, subzoneSeniors, priorityIds, supportsBySubzone, names }: WhatToDoProps) {
  const filter = usePriorityFilter(areas, priorityIds);
  const top = filter.shown.slice(0, TOP_AREAS);
  const more = filter.shown.length - top.length;
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>What to do</PanelTitle>
        <p className="text-xs text-muted-foreground">
          Priority areas first: no one can walk to a centre, or {SUPER_AGED_PCT}%+ of HDB residents are 65+.
        </p>
      </PanelHeader>
      <PanelContent>
        {areas.length === 0 && (
          <p className="text-sm text-muted-foreground">No senior loses a {LIMIT_MIN}-min walk, so no area to alert.</p>
        )}
        {filter.noneUrgent && <NoneUrgent areas={areas.length} className="text-sm text-muted-foreground" />}
        {top.length > 0 && (
          <ul className="flex flex-col divide-y">
            {top.map((a) => {
              const s = subzoneSeniors.get(a.subzone_id);
              return (
                <li key={a.subzone_id} className={`flex items-start gap-3 py-2 text-sm ${filter.muted(a)}`}>
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
                    <span className="mt-1 block">
                      <AreaSupports supports={supportsBySubzone.get(a.subzone_id) ?? []} />
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
        {areas.length > 0 && (
          <p className="text-sm">
            {more > 0 && (
              <>
                {more} <TagBadge tag="MODELLED" /> more priority {more === 1 ? 'area' : 'areas'}, every block and the
                download are in the{' '}
              </>
            )}
            <a href="#support-list" className="font-medium underline underline-offset-2">
              {more > 0 ? 'support list' : 'See every area and block in the support list'}
            </a>
            .
          </p>
        )}
      </PanelContent>
    </Panel>
  );
}
