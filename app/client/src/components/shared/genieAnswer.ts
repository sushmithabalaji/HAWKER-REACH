import type { GenieChatStatus, GenieMessageItem } from '@databricks/appkit-ui/react';
import { roughSeniors } from '@shared/closure-engine';
import { roughDiners } from '@/pages/closures/format';

// What "Ask HawkerReach" (Spec 6, #129) shows for one Genie answer, and how it rounds the numbers in it:
// never more precision than Page 1 and Page 2 show for the same thing (#125, rule 3).

export const MAX_QUESTION_LENGTH = 300;
export const SLOW_AFTER_MS = 20_000;
export const FOOTER = "Estimates from HawkerReach's model. See the Assumptions panel.";
export const ERROR_MESSAGE = "Couldn't answer that. Try rephrasing, or use the page.";
export const EMPTY_MESSAGE = "Genie didn't find an answer to that. Try rephrasing, or use the page.";

export type Cell = string | null;

export interface AnswerTable {
  columns: string[];
  rows: string[][];
}

export interface Answer {
  text: string;
  sql: string | null;
  table: AnswerTable | null;
  // Genie failed, timed out or came back with nothing: show the plain message, never a partial number.
  failed: boolean;
}

// A column that is a share or a ratio, never a count, even when its name says "senior" (e.g. a seniors' share).
const RATIO = /share|pct|percent|rate|ratio|multiplier|per_stall/;
const PERCENT = /share|pct|percent/;

const asNumber = (v: Cell) => (v === null || v.trim() === '' ? null : Number(v));
const plain = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });

// Rounds one column the way the app does: seniors to 5, diners and residents to 10, percentages to whole %.
// A percentage column whose values all sit in 0-1 is a fraction (pct_65p), so it is shown x 100.
export function formatColumn(column: string, values: Cell[]): string[] {
  const nums = values.map(asNumber);
  const numeric = nums.every((n) => n === null || Number.isFinite(n));
  if (!numeric) return values.map((v) => v ?? '–');
  const name = column.toLowerCase();
  const show = (fmt: (n: number) => string) => nums.map((n) => (n === null ? '–' : fmt(n)));
  if (PERCENT.test(name)) {
    const fraction = nums.every((n) => n === null || (n >= 0 && n <= 1));
    return show((n) => `${Math.round(fraction ? n * 100 : n)}%`);
  }
  if (RATIO.test(name)) return show((n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 }));
  if (name.includes('senior')) return show(roughSeniors);
  if (name.includes('diner') || name.includes('resident')) return show(roughDiners);
  // Years and ids stay as Genie wrote them (no "2,026").
  if (/year|_id$/.test(name)) return values.map((v) => v ?? '–');
  return show(plain);
}

export function formatTable(columns: string[], rows: Cell[][]): AnswerTable {
  const formatted = columns.map((c, i) =>
    formatColumn(
      c,
      rows.map((r) => r[i] ?? null)
    )
  );
  return { columns, rows: rows.map((_, r) => columns.map((_, c) => formatted[c][r])) };
}

// One assistant message from useGenieChat: Genie's sentence, the SQL it ran and the rows it got back.
export function toAnswer(message: GenieMessageItem): Answer {
  const text = message.attachments
    .map((a) => a.text?.content?.trim())
    .filter(Boolean)
    .join('\n\n');
  const query = message.attachments.find((a) => a.query?.query);
  const result = query?.attachmentId ? message.queryResults.get(query.attachmentId) : undefined;
  const table = result
    ? formatTable(
        result.manifest.schema.columns.map((c) => c.name),
        result.result.data_array ?? []
      )
    : null;
  const failed =
    Boolean(message.error) || message.status === 'FAILED' || message.status === 'CANCELLED' || (!text && !table);
  return { text, sql: query?.query?.query ?? null, table, failed };
}

// Genie writes light markdown: paragraphs, "- " bullets and **bold**. Anything else shows as plain text.
export type Block = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] };

export function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split('\n').map((l) => l.trim())) {
    const item = /^[-*•]\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (item) {
      if (last?.kind === 'list') last.items.push(item[1]);
      else blocks.push({ kind: 'list', items: [item[1]] });
    } else if (line) {
      if (last?.kind === 'paragraph') last.text = last.text ? `${last.text} ${line}` : line;
      else blocks.push({ kind: 'paragraph', text: line });
    } else if (last) {
      blocks.push({ kind: 'paragraph', text: '' });
    }
  }
  return blocks.filter((b) => b.kind === 'list' || b.text);
}

// "**bold** rest" -> [{ text: 'bold', bold: true }, { text: ' rest', bold: false }]
export function toSpans(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) =>
      /^\*\*[^*]+\*\*$/.test(part) ? { text: part.slice(2, -2), bold: true } : { text: part, bold: false }
    );
}

// Enter sends, Shift+Enter is a new line (#125, Phase 3).
export function keyAction(key: string, shift: boolean, composing: boolean): 'send' | null {
  return key === 'Enter' && !shift && !composing ? 'send' : null;
}

// "2026-11-02T14:05:00" -> "2 Nov 2026"; anything unreadable -> "unknown" (#125: the footer always has a date line).
export function dataDate(builtAt: unknown): string {
  const d = typeof builtAt === 'string' && builtAt ? new Date(builtAt.replace(' ', 'T')) : null;
  if (!d || Number.isNaN(d.getTime())) return 'Data date unknown';
  return `Data as of ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export type ChatItem =
  | { kind: 'question'; id: string; text: string }
  | { kind: 'pending'; id: string }
  | { kind: 'answer'; id: string; answer: Answer }
  | { kind: 'error'; id: string };

// The conversation as the panel shows it. The last answer is pending while the stream is open (rows arrive after
// the sentence), and an error or timeout replaces it with the plain message, never with what arrived so far.
export function toChatItems(messages: GenieMessageItem[], status: GenieChatStatus): ChatItem[] {
  return messages.map((m, i) => {
    const id = `${i}-${m.id}`;
    if (m.role === 'user') return { kind: 'question', id, text: m.content };
    const last = i === messages.length - 1;
    if (last && status === 'error') return { kind: 'error', id };
    if (last && status === 'streaming') return { kind: 'pending', id };
    const answer = toAnswer(m);
    return answer.failed ? { kind: 'error', id } : { kind: 'answer', id, answer };
  });
}
