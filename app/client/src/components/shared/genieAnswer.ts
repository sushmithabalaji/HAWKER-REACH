import type { GenieChatStatus, GenieMessageItem } from '@databricks/appkit-ui/react';
import { roughSeniors } from '@shared/closure-engine';
import { roughDiners } from '@shared/rounding';

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

// The panel shows answers as plain text only: no tables, no SQL.
export interface Answer {
  text: string;
  // Genie failed or timed out (failed), or came back with no sentence and no rows (empty): the panel shows a
  // plain message instead, never a partial number.
  outcome: 'ok' | 'failed' | 'empty';
}

// A column that is a share, a ratio or a pace, never a count, even when its name says "senior" (a seniors' share,
// senior_pace).
const RATIO = /share|pct|percent|rate|ratio|multiplier|per_stall|pace|speed/;
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
  const failed = Boolean(message.error) || message.status === 'FAILED' || message.status === 'CANCELLED';
  // Genie usually writes a sentence; when it only returns rows, say them as plain lines, rounded as the app does.
  const answerText = stripMarkdown(text) || (table ? tableAsText(table) : '');
  const outcome = failed ? 'failed' : !answerText ? 'empty' : 'ok';
  return { text: answerText, outcome };
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

// Plain text: Genie's **bold** and `code` marks are dropped; its "- " bullets stay (toBlocks).
export function stripMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
}

// One line per row: "Kim Keat Palm: seniors cut off 2,125, blocks cut off 28". At most 10 rows.
export function tableAsText(table: AnswerTable): string {
  const label = (c: string) => c.replace(/_/g, ' ');
  const lines = table.rows.slice(0, 10).map((row) => {
    const [first, ...rest] = row;
    const named = table.columns.length > 1 && !/^\d|^–$/.test(first);
    const parts = (named ? rest : row).map((v, i) => `${label(table.columns[named ? i + 1 : i])} ${v}`);
    return `- ${named ? `${first}: ` : ''}${parts.join(', ')}`;
  });
  const more = table.rows.length > 10 ? [`- and ${table.rows.length - 10} more`] : [];
  return [...lines, ...more].join('\n');
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
  | { kind: 'error'; id: string; message: string };

// The conversation as the panel shows it. The answer is pending while the stream is open (rows arrive after the
// sentence). An error or timeout shows the plain message, never what arrived so far: for the open question
// (useGenieChat may already have dropped its placeholder), and for any earlier answer in `failedIds`.
export function toChatItems(
  messages: GenieMessageItem[],
  status: GenieChatStatus,
  failedIds: ReadonlySet<string> = new Set()
): ChatItem[] {
  const error = (id: string, message = ERROR_MESSAGE): ChatItem => ({ kind: 'error', id, message });
  const items = messages.map((m, i): ChatItem => {
    const id = `${i}-${m.id}`;
    if (m.role === 'user') return { kind: 'question', id, text: m.content };
    const last = i === messages.length - 1;
    if (last && status === 'streaming') return { kind: 'pending', id };
    if ((last && status === 'error') || failedIds.has(m.id)) return error(id);
    const answer = toAnswer(m);
    if (answer.outcome === 'failed') return error(id);
    if (answer.outcome === 'empty') return error(id, EMPTY_MESSAGE);
    return { kind: 'answer', id, answer };
  });
  if (messages.at(-1)?.role === 'user') {
    if (status === 'streaming') items.push({ kind: 'pending', id: 'pending' });
    if (status === 'error') items.push(error('error'));
  }
  return items;
}

// The assistant message the hook's error belongs to, so it stays an error after later questions.
export function failedMessageId(messages: GenieMessageItem[], status: GenieChatStatus): string | null {
  const last = messages.at(-1);
  return status === 'error' && last?.role === 'assistant' && last.id ? last.id : null;
}
