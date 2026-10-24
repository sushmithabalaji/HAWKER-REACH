import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { TagBadge } from '@/components/shared/TagBadge';
import { roughCount, type AreaCutOff } from './scenario';
import { LIMIT_MIN, SUPER_AGED_SHARE } from './settings';
import type { SubzoneSeniors } from './subzoneSeniors';
import type { Names } from './names';

interface AreasToAlertProps {
  areas: AreaCutOff[];
  subzoneSeniors: Map<string, SubzoneSeniors>;
  names: Names;
}

const SUPER_AGED_PCT = Math.round(SUPER_AGED_SHARE * 100);

// Subzones whose AAC should check in: every subzone with seniors cut off, most first. The super-aged
// badge is shown beside the count, never multiplied into it (ASSUMPTIONS.md, Areas to alert).
export function AreasToAlert({ areas, subzoneSeniors, names }: AreasToAlertProps) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Areas to alert</PanelTitle>
        <p className="text-xs text-muted-foreground">
          Subzones where seniors lose their {LIMIT_MIN}-min walk, most seniors first. Badged where {SUPER_AGED_PCT}%+ of
          HDB residents are 65+.
        </p>
      </PanelHeader>
      <PanelContent>
        {areas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No senior loses a {LIMIT_MIN}-min walk, so no area to alert.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {areas.map((a) => {
              const s = subzoneSeniors.get(a.subzone_id);
              return (
                <li key={a.subzone_id} className="flex items-start gap-3 py-2 text-sm">
                  <span className="flex-1">
                    <strong>{names.subzone(a.subzone_id)}</strong>
                    {s?.is_super_aged && (
                      <span className="ml-2 inline-block rounded-full bg-highlight-tint px-2 py-px align-middle text-[11px] font-semibold text-highlight">
                        ⚠ {SUPER_AGED_PCT}%+ aged 65+
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
      </PanelContent>
    </Panel>
  );
}
