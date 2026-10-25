import { Fragment, useState } from 'react';
import { Button } from '@databricks/appkit-ui/react';
import { Pill } from '@/components/shared/Pill';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { metres, type Names } from './names';
import { roughCount } from './scenario';
import { useTopAreas } from './useTopAreas';
import { MULTIPLIER_BANDS } from './legend';
import { Swatch } from './Swatch';
import { multiplierBand, type SubzoneSeniors } from './subzoneSeniors';
import { LIMIT_MIN } from './settings';
import { AreaSupports, SupportPill } from './SupportPills';
import {
  blockReason,
  OTHER_LABEL,
  OTHER_NOTE,
  rankAreas,
  SUPPORT_WHEN,
  SUPPORTS,
  supportCsv,
  TOP_AREAS,
  type OtherArea,
  type SupportArea,
} from './support';

interface SupportListProps {
  areas: SupportArea[];
  // Areas the closure touches without cutting seniors off, listed after the ones that need support.
  others: OtherArea[];
  closedName: string | null;
  priorityIds: ReadonlySet<string> | null;
  subzoneSeniors: Map<string, SubzoneSeniors>;
  names: Names;
}

// The area's vulnerability band and multiplier, as on the vulnerability map.
function Vulnerability({ seniors }: { seniors: SubzoneSeniors | undefined }) {
  const multiplier = seniors?.multiplier ?? null;
  const band = multiplierBand(multiplier);
  if (multiplier === null || band === null) return <span>Too few residents</span>;
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <Swatch colour={MULTIPLIER_BANDS[band].hex} square />
      {MULTIPLIER_BANDS[band].name}
      <span className="font-mono">×{multiplier.toFixed(2)}</span>
    </span>
  );
}

const walk = (m: number | null) => (m === null ? '' : ` · ${metres(m)}`);

// Switches the list between its top areas and every affected area.
function ShowAllToggle({ showAll, areas, onToggle }: { showAll: boolean; areas: number; onToggle: () => void }) {
  return (
    <div>
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onToggle}>
        {showAll ? `Show the top ${TOP_AREAS} only` : `Show all ${areas} affected areas`}
      </Button>
    </div>
  );
}

// The support options (#118), collapsed under the list: each with when it applies and how many of the areas
// listed above need it, so the counts follow "Top 5" and "Show all". Closed by default, so it never competes
// with the ranked areas.
function SupportOptions({ areas }: { areas: SupportArea[] }) {
  const used = (support: (typeof SUPPORTS)[number]) =>
    areas.filter((a) => a.supports.some((s) => s.support === support)).length;
  const needed = SUPPORTS.filter((s) => used(s) > 0).length;
  return (
    <details className="group rounded-md border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="inline-block text-xs transition-transform group-open:rotate-90">
          ▸
        </span>
        Support options
        <span className="font-normal text-foreground">
          · {needed} of {SUPPORTS.length} needed for the areas listed
        </span>
      </summary>
      <ul className="divide-y border-t px-3 text-sm">
        {SUPPORTS.map((support) => {
          const n = used(support);
          return (
            <li key={support} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
              <SupportPill support={support} />
              <span className="flex-1 text-foreground">when {SUPPORT_WHEN[support]}</span>
              <span
                className={`whitespace-nowrap ${n === 0 ? 'text-muted-foreground' : 'font-semibold text-foreground'}`}
              >
                {n === 0 ? 'Not needed' : `${n} ${n === 1 ? 'area' : 'areas'}`}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

// The link is added to the page and the URL kept a moment, or Firefox and Safari can drop the download.
function download(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fileSafe = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

type Row = { kind: 'support'; area: SupportArea } | { kind: 'other'; area: OtherArea };

// Who needs what support after the closure: one row per affected subzone, up to the top few until the user
// asks for all. Areas with seniors cut off come first (priority first), each with its blocks behind an
// expand control; then areas with a longer walk or a lost backup centre. The download has every cut-off block.
export function SupportList({ areas, others, closedName, priorityIds, subzoneSeniors, names }: SupportListProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggleBlocks = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const rows: Row[] = [
    ...rankAreas(areas, priorityIds).map((area): Row => ({ kind: 'support', area })),
    ...others.map((area): Row => ({ kind: 'other', area })),
  ];
  const filter = useTopAreas(rows);
  const shown = filter.shown;
  // The areas needing support among the rows listed, for the support options' counts (#118).
  const shownSupport = shown.flatMap((r) => (r.kind === 'support' ? [r.area] : []));
  const blocks = shown.reduce((n, r) => n + (r.kind === 'support' ? r.area.blocks.length : 0), 0);

  const onDownload = () => {
    if (!closedName) return;
    const date = new Date().toISOString().slice(0, 10);
    const multiplierOf = (id: string) => subzoneSeniors.get(id)?.multiplier ?? null;
    download(
      supportCsv(areas, names, priorityIds ?? new Set(), multiplierOf),
      `senior-support-${fileSafe(closedName)}-${date}.csv`
    );
  };

  return (
    <Panel id="support-list">
      <PanelHeader className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2">
        <PanelTitle className="flex-1 text-xl">Senior support list</PanelTitle>
        {closedName && shown.length > 0 && (
          <Pill tone="outline">
            {filter.showAll || !filter.canToggle
              ? `${shown.length} ${shown.length === 1 ? 'area' : 'areas'}`
              : `Top ${TOP_AREAS} of ${rows.length} areas`}{' '}
            {blocks > 0 && `· ${blocks} ${blocks === 1 ? 'block' : 'blocks'} `}· after {closedName} closes
          </Pill>
        )}
      </PanelHeader>
      <PanelContent>
        {!closedName && (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Close a centre to list the blocks whose seniors lose their {LIMIT_MIN}-min walk, and the support each needs.
          </p>
        )}
        {closedName && areas.length === 0 && (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            No senior loses a {LIMIT_MIN}-min walk when {closedName} closes, so no one needs extra support.
            {others.length > 0 && ' The areas below are still touched by the closure.'}
          </p>
        )}
        {shown.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="text-left font-mono text-xs tracking-wide text-muted-foreground">
                  <th className="border-b-2 border-border-strong px-3 py-2">SUBZONE / BLOCK</th>
                  <th className="border-b-2 border-border-strong px-3 py-2">EST. SENIORS</th>
                  <th className="border-b-2 border-border-strong px-3 py-2">VULNERABILITY</th>
                  <th className="border-b-2 border-border-strong px-3 py-2">ALTERNATIVE CENTRE</th>
                  <th className="border-b-2 border-border-strong px-3 py-2">SUGGESTED SUPPORT</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) =>
                  row.kind === 'other' ? (
                    <tr key={row.area.subzone_id} className="border-b">
                      <td className="px-3 py-2">
                        <strong>{names.subzone(row.area.subzone_id)}</strong>
                        <span className="ml-2">
                          <Pill tone="outline">{OTHER_LABEL[row.area.kind]}</Pill>
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono">{roughCount(row.area.seniors)}</td>
                      <td className="px-3 py-2">
                        <Vulnerability seniors={subzoneSeniors.get(row.area.subzone_id)} />
                      </td>
                      <td className="px-3 py-2">–</td>
                      <td className="px-3 py-2">{OTHER_NOTE[row.area.kind]}</td>
                    </tr>
                  ) : (
                    <Fragment key={row.area.subzone_id}>
                      <tr className="border-b bg-muted/40">
                        <td className="px-3 py-2">
                          <strong>{names.subzone(row.area.subzone_id)}</strong>
                          {priorityIds?.has(row.area.subzone_id) && (
                            <span className="ml-2">
                              <Pill tone="highlight">Priority</Pill>
                            </span>
                          )}
                          <Button
                            variant="link"
                            size="sm"
                            className="block h-auto p-0 text-xs text-muted-foreground"
                            aria-expanded={expanded.has(row.area.subzone_id)}
                            onClick={() => toggleBlocks(row.area.subzone_id)}
                          >
                            {expanded.has(row.area.subzone_id) ? 'Hide' : 'Show'} {row.area.blocks.length}{' '}
                            {row.area.blocks.length === 1 ? 'block' : 'blocks'}
                          </Button>
                        </td>
                        <td className="px-3 py-2 font-mono">{roughCount(row.area.seniors)}</td>
                        <td className="px-3 py-2">
                          <Vulnerability seniors={subzoneSeniors.get(row.area.subzone_id)} />
                        </td>
                        <td className="px-3 py-2">
                          {row.area.alternative
                            ? `${names.centre(row.area.alternative.centreId)}${walk(row.area.alternative.walkM)}`
                            : names.centre(null)}
                        </td>
                        <td className="px-3 py-2">
                          <AreaSupports supports={row.area.supports} />
                        </td>
                      </tr>
                      {expanded.has(row.area.subzone_id) &&
                        row.area.blocks.map(({ outcome: o, support }, i) => (
                          <tr key={o.block.block_id} className="border-b text-muted-foreground">
                            <td className="py-1.5 pl-6 pr-3">
                              <span
                                className="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 font-mono text-xs font-semibold text-foreground"
                                aria-label={`Rank ${i + 1}`}
                              >
                                {i + 1}
                              </span>
                              {o.block.block_label}
                            </td>
                            <td className="px-3 py-1.5 font-mono">{roughCount(o.block.est_seniors)}</td>
                            <td className="px-3 py-1.5" />
                            <td className="px-3 py-1.5">
                              {names.centre(o.afterCentreId)}
                              {walk(o.afterWalkM)}
                            </td>
                            <td className="px-3 py-1.5">
                              <SupportPill support={support} reason={blockReason(o)} />
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
        {filter.canToggle && <ShowAllToggle showAll={filter.showAll} areas={rows.length} onToggle={filter.toggle} />}
        {closedName && shownSupport.length > 0 && <SupportOptions areas={shownSupport} />}
        <div>
          <Button size="lg" onClick={onDownload} disabled={areas.length === 0}>
            Download list (CSV)
          </Button>
        </div>
      </PanelContent>
    </Panel>
  );
}
