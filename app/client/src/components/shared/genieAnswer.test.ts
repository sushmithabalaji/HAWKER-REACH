import { describe, expect, test } from 'vitest';
import type { GenieMessageItem } from '@databricks/appkit-ui/react';
import {
  EMPTY_MESSAGE,
  ERROR_MESSAGE,
  dataDate,
  failedMessageId,
  formatColumn,
  formatTable,
  keyAction,
  toAnswer,
  toBlocks,
  toChatItems,
  stripMarkdown,
  tableAsText,
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
    expect(formatColumn('senior_pace', ['1.0'])).toEqual(['1']);
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
    expect(a).toEqual({ text: 'About 2,125 seniors.', outcome: 'ok' });
  });

  test('rows with no sentence become plain lines, rounded as the app does', () => {
    const a = toAnswer(
      message({
        attachments: [{ attachmentId: 'q1', query: { query: 'SELECT 1' } }],
        queryResults: new Map([['q1', statement]]),
      })
    );
    expect(a).toEqual({ text: '- Kim Keat: seniors cut off 2,125', outcome: 'ok' });
  });

  test('a refusal with no query is a plain text answer', () => {
    const a = toAnswer(message({ attachments: [{ text: { content: "We don't have footfall data." } }] }));
    expect(a).toEqual({ text: "We don't have footfall data.", outcome: 'ok' });
  });

  test('failed when Genie errors or fails, empty when it returns nothing', () => {
    expect(toAnswer(message({ attachments: [] })).outcome).toBe('empty');
    expect(toAnswer(message({ error: 'boom', attachments: [{ text: { content: 'partial' } }] })).outcome).toBe(
      'failed'
    );
    expect(toAnswer(message({ status: 'FAILED', attachments: [{ text: { content: 'x' } }] })).outcome).toBe('failed');
  });
});

describe('toBlocks, stripMarkdown and tableAsText', () => {
  test('paragraphs and "- " bullets', () => {
    expect(toBlocks('Super-aged:\n- **POTONG PASIR** (34%)\n- KIM KEAT (24%)\n\nAll estimates.')).toEqual([
      { kind: 'paragraph', text: 'Super-aged:' },
      { kind: 'list', items: ['**POTONG PASIR** (34%)', 'KIM KEAT (24%)'] },
      { kind: 'paragraph', text: 'All estimates.' },
    ]);
  });

  test('drops **bold** and `code` marks', () => {
    expect(stripMarkdown('About **2,125** seniors in `access_sensitivity`')).toBe(
      'About 2,125 seniors in access_sensitivity'
    );
  });

  test('one line per row, ten at most', () => {
    expect(
      tableAsText({
        columns: ['limit_min', 'seniors_cut_off'],
        rows: [
          ['10', '1,630'],
          ['15', '2,125'],
        ],
      })
    ).toBe('- limit min 10, seniors cut off 1,630\n- limit min 15, seniors cut off 2,125');
    const many = { columns: ['year'], rows: Array.from({ length: 12 }, (_, i) => [String(2000 + i)]) };
    expect(tableAsText(many).split('\n').at(-1)).toBe('- and 2 more');
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
    expect(toChatItems([q, a], 'error')[1]).toMatchObject({ message: ERROR_MESSAGE });
  });

  test('a connection error or timeout after the hook dropped the placeholder still shows the message', () => {
    expect(toChatItems([q], 'error').map((i) => i.kind)).toEqual(['question', 'error']);
    expect(toChatItems([q], 'streaming').map((i) => i.kind)).toEqual(['question', 'pending']);
  });

  test('an empty answer says Genie found nothing', () => {
    expect(toChatItems([q, message({ id: 'e' })], 'idle')[1]).toMatchObject({ kind: 'error', message: EMPTY_MESSAGE });
  });

  test('an answer that failed stays failed after later questions', () => {
    expect(failedMessageId([q, a], 'error')).toBe('a');
    expect(failedMessageId([q, a], 'idle')).toBeNull();
    const later = toChatItems(
      [q, a, q, message({ id: 'b', attachments: [{ text: { content: 'ok' } }] })],
      'idle',
      new Set(['a'])
    );
    expect(later.map((i) => i.kind)).toEqual(['question', 'error', 'question', 'answer']);
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
