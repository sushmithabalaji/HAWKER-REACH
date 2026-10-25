import { assumedNumber } from '@shared/assumptions';
import type { PlanResult } from '@shared/closure-engine';
import { Pill } from '@/components/shared/Pill';
import { demandWasteView } from './demandWasteView';

const FLAG_PCT = Math.round(assumedNumber('actions.waste.flag_pct') * 100);
const FLAG_RULE = `extra diners above ${FLAG_PCT}% of the diners it has today`;
const HEAD = 'border-b-2 border-foreground px-3 py-2';

// The "Demand dispersion and waste" section (#54, #72): every centre taking displaced diners, with its load
// and extra waste, and a total row for the plan.
export function DemandWaste({ result, placeholder }: { result: PlanResult | null; placeholder: string }) {
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-left font-mono text-xs tracking-wide text-muted-foreground">
              <th className={HEAD}>CENTRE</th>
              <th className={HEAD}>DINERS A DAY</th>
              <th className={HEAD}>EXTRA A DAY</th>
              <th className={HEAD}>EXTRA PER STALL</th>
              <th className={HEAD}>EXTRA WASTE, KG A DAY</th>
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
                <td className="px-3 py-2 font-mono">{r.extraDiners}</td>
                <td className="px-3 py-2 font-mono">{r.perStall}</td>
                <td className="px-3 py-2 font-mono">{r.wasteKg}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-foreground font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2 font-mono">{view.totalExtraDiners}</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2 font-mono">
                {view.totalBase} <span className="text-xs font-normal text-muted-foreground">({view.totalRange})</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
