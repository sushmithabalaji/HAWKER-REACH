import { assumedNumber } from '@shared/assumptions';
import type { PlanResult } from '@shared/closure-engine';
import { Pill } from '@/components/shared/Pill';
import { TagBadge } from '@/components/shared/TagBadge';
import { demandWasteView } from './demandWasteView';

const FLAG_PCT = Math.round(assumedNumber('actions.waste.flag_pct') * 100);
const FLAG_RULE = `extra diners above ${FLAG_PCT}% of the diners it has today`;
const HEAD = 'border-b-2 border-foreground px-3 py-2';

// The "Demand & waste" tab (#54): every centre taking displaced diners, with its load and extra waste.
export function DemandWasteTab({ result, placeholder }: { result: PlanResult | null; placeholder: string }) {
  if (!result) return <p className="text-sm text-muted-foreground">{placeholder}</p>;
  const view = demandWasteView(result.demandWaste);
  if (view.rows.length === 0) {
    return (
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        This plan displaces no modelled diners, so no centre takes extra demand and there is no extra waste.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        Extra waste across the plan: <strong className="font-mono text-base">{view.totalBase}</strong>{' '}
        <span className="text-muted-foreground">(range {view.totalRange})</span>
        <TagBadge tag="ASSUMPTION" />
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="text-left font-mono text-xs tracking-wide text-muted-foreground">
              <th className={HEAD}>CENTRE</th>
              <th className={HEAD}>
                DINERS A DAY <TagBadge tag="MODELLED" />
              </th>
              <th className={HEAD}>
                EXTRA A DAY <TagBadge tag="MODELLED" />
              </th>
              <th className={HEAD}>
                EXTRA PER STALL <TagBadge tag="MODELLED" />
              </th>
              <th className={HEAD}>
                EXTRA WASTE, KG A DAY <TagBadge tag="ASSUMPTION" />
              </th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r) => (
              <tr key={r.centreId} className={`border-b ${r.flagged ? 'bg-highlight-tint/40' : ''}`}>
                <td className="px-3 py-2">
                  <span className="font-medium">{r.name}</span>{' '}
                  {r.flagged && (
                    <span title={FLAG_RULE}>
                      <Pill tone="highlight">! NEA actions flag</Pill>
                    </span>
                  )}{' '}
                  {r.possiblyUndercounted && <Pill tone="outline">Possibly under-counted</Pill>}
                </td>
                <td className="px-3 py-2 font-mono">{r.baseline}</td>
                <td className="px-3 py-2 font-mono">
                  {r.extraDiners}
                  <span className="block text-xs text-muted-foreground">{r.pctOverBaseline} on its own baseline</span>
                </td>
                <td className="px-3 py-2 font-mono">{r.perStall}</td>
                <td className="px-3 py-2 font-mono">{r.wasteKg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {view.flaggedCount > 0 ? `${view.flaggedCount} flagged` : 'None flagged'}: {FLAG_RULE}, the same rule as the NEA
        actions line on the verdict cards. Waste is extra diners × kg per diner per day, an unsourced bracket; the range
        also covers 1–5 visits a week (see the Assumptions panel). Reads gold.block_options · gold.centres ·
        gold.centre_demand.
      </p>
    </div>
  );
}
