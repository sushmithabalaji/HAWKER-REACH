import { isTag, type Tag } from './tags';
import assumptionsJson from './assumptions.json';

// Mirrors one entry of the repo-root assumptions.json (synced by `npm run sync:assumptions`).
export type Status = 'sourced' | 'open' | 'decided';
export interface AssumptionEntry {
  name: string;
  value: number | string;
  unit: string;
  tag: string;
  source: string;
  status: Status;
  owner: string;
  used_by: string[];
}
export type Assumptions = Record<string, AssumptionEntry>;

export const assumptions = assumptionsJson as Assumptions;

// A numeric value from assumptions.json, for code that computes with it (both pages read their model
// values this way, so the notebooks and the app can't disagree).
export function assumedNumber(key: string, all: Assumptions = assumptions): number {
  const entry = all[key];
  if (!entry) throw new Error(`Unknown assumptions.json key: ${key}`);
  const n = Number(entry.value);
  if (!Number.isFinite(n)) throw new Error(`assumptions.json ${key} is not a number`);
  return n;
}

export interface ResolvedLine {
  text: string;
  tag: Tag | null; // null for a known limitation, which describes the model rather than a number
  source: string;
}

// A line in an Assumptions panel: written out, read from an assumptions.json key, or a known limitation.
export type WrittenLine = { text: string; tag: Tag; source: string; status: Status };
export type AssumptionLine = WrittenLine | { key: string } | { limitation: string };

export const UNSOURCED = 'illustrative, unsourced';

export function resolveLine(line: AssumptionLine, all: Assumptions = assumptions): ResolvedLine {
  if ('limitation' in line) return { text: line.limitation, tag: null, source: 'Known limitation' };
  if ('key' in line) {
    const entry = all[line.key];
    if (!entry) throw new Error(`Unknown assumptions.json key: ${line.key}`);
    if (!isTag(entry.tag)) throw new Error(`Bad tag for ${line.key}: ${entry.tag}`);
    const text = `${entry.name}: ${entry.value} ${entry.unit}`;
    return { text, tag: entry.tag, source: sourceFor(entry.status, entry.source) };
  }
  return { text: line.text, tag: line.tag, source: sourceFor(line.status, line.source) };
}

// "open" means the value still needs a source (CLAUDE.md, Decisions).
function sourceFor(status: Status, source: string): string {
  if (status !== 'open') return source;
  return source.trim() ? `${source} (source still needed)` : UNSOURCED;
}
