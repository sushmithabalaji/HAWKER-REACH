import { Fragment, useState } from 'react';
import { Button } from '@databricks/appkit-ui/react';
import { Pill } from '@/components/shared/Pill';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { metres, type Names } from './names';
import { roughCount } from './scenario';
import { NoneUrgent, ShowAllToggle } from './priority';
import { usePriorityFilter } from './usePriorityFilter';
import { LIMIT_MIN } from './settings';
import { AreaSupports, SupportPill } from './SupportPills';
import { blockReason, supportCsv, type SupportArea } from './support';

interface SupportListProps {
  areas: SupportArea[];
  closedName: string | null;
  priorityIds: ReadonlySet<string> | null;
  names: Names;
}

const walk = (m: number | null) => (m === null ? '' : ` · ${metres(m)}`);

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

// Who needs what support after the closure: one row per subzone with seniors cut off, its blocks behind
// an expand control. Priority areas only until the user asks for all; the download always has every block.
export function SupportList({ areas, closedName, priorityIds, names }: SupportListProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggleBlocks = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const filter = usePriorityFilter(areas, priorityIds);
  const shown = filter.shown;
  const blocks = shown.reduce((n, a) => n + a.blocks.length, 0);

  const onDownload = () => {
    if (!closedName) return;
    const date = new Date().toISOString().slice(0, 10);
    download(supportCsv(areas, names, priorityIds ?? new Set()), `senior-support-${fileSafe(closedName)}-${date}.csv`);
  };

  return (
    <Panel id="support-list">
      <PanelHeader className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2">
        <PanelTitle className="flex-1 text-xl">Senior support list</PanelTitle>
        {closedName && shown.length > 0 && (
          <Pill tone="outline">
            {shown.length} {filter.showAll || !priorityIds ? '' : 'priority '}
            {shown.length === 1 ? 'area' : 'areas'} · {blocks} blocks · after {closedName} closes
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
            No senior loses a {LIMIT_MIN}-min walk when {closedName} closes, so no one needs support.
          </p>
        )}
        {filter.noneUrgent && (
          <NoneUrgent areas={areas.length} className="rounded-md bg-muted p-3 text-sm text-muted-foreground" />
        )}
        {shown.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="text-left font-mono text-xs tracking-wide text-muted-foreground">
                  <th className="border-b-2 border-foreground px-3 py-2">SUBZONE / BLOCK</th>
                  <th className="border-b-2 border-foreground px-3 py-2">EST. SENIORS</th>
                  <th className="border-b-2 border-foreground px-3 py-2">ALTERNATIVE CENTRE</th>
                  <th className="border-b-2 border-foreground px-3 py-2">SUGGESTED SUPPORT</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((area) => (
                  <Fragment key={area.subzone_id}>
                    <tr className={`border-b bg-muted/40 ${filter.muted(area)}`}>
                      <td className="px-3 py-2">
                        <strong>{names.subzone(area.subzone_id)}</strong>
                        <Button
                          variant="link"
                          size="sm"
                          className="block h-auto p-0 text-xs text-muted-foreground"
                          aria-expanded={expanded.has(area.subzone_id)}
                          onClick={() => toggleBlocks(area.subzone_id)}
                        >
                          {expanded.has(area.subzone_id) ? 'Hide' : 'Show'} {area.blocks.length}{' '}
                          {area.blocks.length === 1 ? 'block' : 'blocks'}
                        </Button>
                      </td>
                      <td className="px-3 py-2 font-mono">{roughCount(area.seniors)}</td>
                      <td className="px-3 py-2">
                        {area.alternative
                          ? `${names.centre(area.alternative.centreId)}${walk(area.alternative.walkM)}`
                          : names.centre(null)}
                      </td>
                      <td className="px-3 py-2">
                        <AreaSupports supports={area.supports} />
                      </td>
                    </tr>
                    {expanded.has(area.subzone_id) &&
                      area.blocks.map(({ outcome: o, support }) => (
                        <tr key={o.block.block_id} className={`border-b text-muted-foreground ${filter.muted(area)}`}>
                          <td className="py-1.5 pl-8 pr-3">{o.block.block_label}</td>
                          <td className="px-3 py-1.5 font-mono">{roughCount(o.block.est_seniors)}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filter.canToggle && <ShowAllToggle showAll={filter.showAll} areas={areas.length} onToggle={filter.toggle} />}
        <div>
          <Button size="lg" onClick={onDownload} disabled={areas.length === 0}>
            Download list (CSV)
          </Button>
        </div>
      </PanelContent>
    </Panel>
  );
}
