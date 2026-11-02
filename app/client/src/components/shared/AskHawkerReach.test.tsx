import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatGate, ChatPanel } from './AskHawkerReach';
import { ERROR_MESSAGE, FOOTER, type ChatItem } from './genieAnswer';

const noop = () => {};
const panel = (items: ChatItem[], over: { waiting?: boolean; slow?: boolean } = {}) =>
  renderToStaticMarkup(
    <ChatPanel
      items={items}
      waiting={over.waiting ?? false}
      slow={over.slow ?? false}
      dateLine="Data as of 2 Nov 2026"
      onSend={noop}
      onNewChat={noop}
      onClose={noop}
    />
  );

describe('ChatGate', () => {
  test('renders nothing while the flag is off or unknown', () => {
    expect(renderToStaticMarkup(<ChatGate features={null} />)).toBe('');
    expect(renderToStaticMarkup(<ChatGate features={{ genie: false }} />)).toBe('');
  });
});

describe('ChatPanel', () => {
  test('empty: the estimates line and the four suggested questions', () => {
    const html = panel([]);
    expect(html).toContain('Numbers are estimates.');
    expect(html).toContain('Beta');
    for (const chip of [
      'Seniors cut off if Kim Keat closes',
      'Top 5 closures in 2026',
      'Closures per year',
      'What pace do you assume for seniors?',
    ]) {
      expect(html).toContain(chip);
    }
    expect(html).toContain('aria-live="polite"');
  });

  test('waiting: typing indicator and the input disabled; "Still working..." once slow', () => {
    const items: ChatItem[] = [
      { kind: 'question', id: 'q', text: 'Kim Keat?' },
      { kind: 'pending', id: 'p' },
    ];
    const html = panel(items, { waiting: true });
    expect(html).toMatch(/<textarea[^>]*disabled=""/);
    expect(html).toContain('Genie is answering');
    expect(html).not.toContain('Still working...');
    expect(panel(items, { waiting: true, slow: true })).toContain('Still working...');
  });

  test('an error or timeout shows only the plain message', () => {
    const html = panel([
      { kind: 'question', id: 'q', text: 'Kim Keat?' },
      { kind: 'error', id: 'e', message: ERROR_MESSAGE },
    ]);
    expect(html).toContain(ERROR_MESSAGE.replace("'", '&#x27;'));
    expect(html).not.toContain(FOOTER.replace("'", '&#x27;'));
  });

  test('an answer: text, rounded table, SQL folded away, footer with the data date', () => {
    const html = panel([
      {
        kind: 'answer',
        id: 'a',
        answer: {
          text: 'About **2,125** seniors.',
          sql: 'SELECT seniors_cut_off FROM hawkerreach.gold.access_sensitivity',
          table: { columns: ['seniors_cut_off'], rows: [['2,125']] },
          outcome: 'ok',
        },
      },
    ]);
    expect(html).toContain('<strong>2,125</strong>');
    expect(html).toContain('<td class="px-2 py-1 font-mono">2,125</td>');
    expect(html).toMatch(/<details[^>]*><summary[^>]*>Show SQL<\/summary>/);
    expect(html).not.toMatch(/<details[^>]*open/);
    expect(html).toContain('See the Assumptions panel. Data as of 2 Nov 2026.');
    expect(html).not.toMatch(/<textarea[^>]*disabled=""/);
  });
});
