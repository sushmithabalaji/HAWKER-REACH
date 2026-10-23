import { isTag, type Tag } from './tags';
import assumptionsJson from './assumptions.json';

// Mirrors one entry of the repo-root assumptions.json (synced by `npm run sync:assumptions`).
export type Status = 'sourced' | 'open' | 'decided';
export interface AssumptionEntry {
  name: string;
  value: number | string;
  unit: string;
  tag: Tag;
  source: string;
  status: Status;
  owner: string;
  used_by: string[];
}
export type Assumptions = Record<string, AssumptionEntry>;

export const assumptions = assumptionsJson as Assumptions;

// A line in a page's Assumptions panel: either written out, or read from an assumptions.json key.
export type AssumptionLine =
  | { text: string; tag: Tag; source: string; status: Status }
  | { key: string };

export interface ResolvedLine {
  text: string;
  tag: Tag;
  source: string;
}

export const UNSOURCED = 'illustrative, unsourced';

export function resolveLine(line: AssumptionLine, all: Assumptions = assumptions): ResolvedLine {
  if ('key' in line) {
    const entry = all[line.key];
    if (!entry) throw new Error(`Unknown assumptions.json key: ${line.key}`);
    if (!isTag(entry.tag)) throw new Error(`Bad tag for ${line.key}: ${String(entry.tag)}`);
    const text = `${entry.name}: ${entry.value} ${entry.unit}`;
    return { text, tag: entry.tag, source: sourceFor(entry.status, entry.source) };
  }
  return { text: line.text, tag: line.tag, source: sourceFor(line.status, line.source) };
}

// "open" means the value still needs a source, so it's shown as illustrative.
function sourceFor(status: Status, source: string): string {
  return status === 'open' ? UNSOURCED : source;
}
