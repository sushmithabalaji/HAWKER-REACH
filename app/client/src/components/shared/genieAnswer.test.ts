import { describe, expect, test } from 'vitest';
import type { GenieMessageItem } from '@databricks/appkit-ui/react';
import {
  dataDate,
  formatColumn,
  formatTable,
  keyAction,
  toAnswer,
  toBlocks,
  toChatItems,
  toSpans,
} from './genieAnswer';

const message = (over: Partial<GenieMessageItem>): GenieMessageItem => ({
  id: 'm1',
  role: 'assistant',
  content: 'question echoed back',
  status: 'COMPLETED',
  attachments: [],
  queryResults: new Map(),
  ...over,
});

describe('formatColumn', () => {
  test('rounds senior columns to 5, as roughSeniors, with "<5" under 5', () => {
    expect(formatColumn('seniors_cut_off', ['2123.066', '3.4', '0.0', null])).toEqual(['2,125', '<5', '0', '–']);
    expect(formatColumn('hdb_seniors', ['2930'])).toEqual(['2,930']);
  });

  test('rounds diner and resident columns to 10, as roughDiners', () => {
    expect(formatColumn('baseline_diners_per_day', ['1234.6', '3', '0'])).toEqual(['1,230', '<10', '0']);
    expect(formatColumn('residents_displaced', ['110976.5'])).toEqual(['110,980']);
  });

  test('leaves other columns alone: no senior rounding on names, dates, years or ids', () => {
    expect(formatColumn('name', ['Kim Keat Palm', null])).toEqual(['Kim Keat Palm', '–']);
    expect(formatColumn('start_date', ['2026-09-14'])).toEqual(['2026-09-14']);
    expect(formatColumn('year', ['2024'])).toEqual(['2024']);
    expect(formatColumn('blocks_cut_off', ['28'])).toEqual(['28']);
    expect(formatColumn('median_days', ['89.5'])).toEqual(['89.5']);
  });

  test('shows a share or percentage column as a whole percent, a 0-1 fraction x 100', () => {
    expect(formatColumn('pct_65p', ['0.2488', '0.29'])).toEqual(['25%', '29%']);
    expect(formatColumn('pct_65p', ['34.0', '23.0'])).toEqual(['34%', '23%']);
    expect(formatColumn('worst_neighbour_pct', ['69.85'])).toEqual(['70%']);
    expect(formatColumn('senior_share', ['0.237'])).toEqual(['24%']);
  });

  test('never rounds a ratio as a count, even with "senior" or "resident" in its name', () => {
    expect(formatColumn('seniors_multiplier', ['1.1931'])).toEqual(['1.19']);
    expect(formatColumn('residents_per_stall', ['1.42'])).toEqual(['1.42']);
  });
});

describe('formatTable', () => {
  test('formats each column and keeps rows in order', () => {
    expect(
      formatTable(
        ['name', 'seniors_cut_off'],
        [
          ['A', '1628.8'],
          ['B', '2'],
        ]
      )
    ).toEqual({
      columns: ['name', 'seniors_cut_off'],
      rows: [
        ['A', '1,630'],
        ['B', '<5'],
      ],
    });
  });
});

describe('toAnswer', () => {
  const statement = {
    manifest: {
      schema: {
        columns: [
          { name: 'name', type_name: 'STRING' },
          { name: 'seniors_cut_off', type_name: 'DOUBLE' },
        ],
      },
    },
    result: { data_array: [['Kim Keat', '2123.07']] },
  };

  test("takes Genie's sentence, its SQL and its rows, rounded; not the echoed question", () => {
    const a = toAnswer(
      message({
        attachments: [
          { attachmentId: 'q1', query: { query: 'SELECT 1' } },
          { text: { content: 'About **2,125** seniors.' } },
        ],
        queryResults: new Map([['q1', statement]]),
      })
    );
    expect(a).toEqual({
      text: 'About **2,125** seniors.',
      sql: 'SELECT 1',
      table: { columns: ['name', 'seniors_cut_off'], rows: [['Kim Keat', '2,125']] },
      failed: false,
    });
  });

  test('a refusal with no query is a plain text answer', () => {
    const a = toAnswer(message({ attachments: [{ text: { content: "We don't have footfall data." } }] }));
    expect(a.failed).toBe(false);
    expect(a.table).toBeNull();
    expect(a.sql).toBeNull();
  });

  test('fails when Genie errors, fails or returns nothing', () => {
    expect(toAnswer(message({ attachments: [] })).failed).toBe(true);
    expect(toAnswer(message({ error: 'boom', attachments: [{ text: { content: 'partial' } }] })).failed).toBe(true);
    expect(toAnswer(message({ status: 'FAILED', attachments: [{ text: { content: 'x' } }] })).failed).toBe(true);
  });
});

describe('toBlocks and toSpans', () => {
  test('paragraphs and "- " bullets', () => {
    expect(toBlocks('Super-aged:\n- **POTONG PASIR** (34%)\n- KIM KEAT (24%)\n\nAll estimates.')).toEqual([
      { kind: 'paragraph', text: 'Super-aged:' },
      { kind: 'list', items: ['**POTONG PASIR** (34%)', 'KIM KEAT (24%)'] },
      { kind: 'paragraph', text: 'All estimates.' },
    ]);
  });

  test('**bold** spans', () => {
    expect(toSpans('About **2,125** seniors')).toEqual([
      { text: 'About ', bold: false },
      { text: '2,125', bold: true },
      { text: ' seniors', bold: false },
    ]);
  });
});

describe('keyAction', () => {
  test('Enter sends; Shift+Enter and composing text do not', () => {
    expect(keyAction('Enter', false, false)).toBe('send');
    expect(keyAction('Enter', true, false)).toBeNull();
    expect(keyAction('Enter', false, true)).toBeNull();
    expect(keyAction('a', false, false)).toBeNull();
  });
});

describe('dataDate', () => {
  test('a date, or "Data date unknown"', () => {
    expect(dataDate('2026-11-02T14:05:00.000')).toBe('Data as of 2 Nov 2026');
    expect(dataDate('2026-11-02 14:05:00')).toBe('Data as of 2 Nov 2026');
    expect(dataDate(null)).toBe('Data date unknown');
    expect(dataDate('nonsense')).toBe('Data date unknown');
  });
});

describe('toChatItems', () => {
  const q = message({ id: 'u', role: 'user', content: 'Kim Keat?' });
  const a = message({ id: 'a', attachments: [{ text: { content: 'About 2,125 seniors.' } }] });

  test('questions, then the answer once the stream has ended', () => {
    expect(toChatItems([q, a], 'idle').map((i) => i.kind)).toEqual(['question', 'answer']);
  });

  test('the last answer is pending while streaming, even if a sentence has arrived', () => {
    expect(toChatItems([q, a], 'streaming').map((i) => i.kind)).toEqual(['question', 'pending']);
  });

  test('an error or timeout shows the plain message instead of anything partial', () => {
    expect(toChatItems([q, a], 'error').map((i) => i.kind)).toEqual(['question', 'error']);
    expect(toChatItems([q, message({ id: 'e' })], 'idle').map((i) => i.kind)).toEqual(['question', 'error']);
  });

  test('earlier answers stay when a later one fails', () => {
    expect(toChatItems([q, a, q, message({ id: 'x' })], 'error').map((i) => i.kind)).toEqual([
      'question',
      'answer',
      'question',
      'error',
    ]);
  });
});
