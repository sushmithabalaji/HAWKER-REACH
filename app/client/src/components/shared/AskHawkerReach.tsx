/* eslint-disable react/no-array-index-key -- an answer's paragraphs and bullets never reorder */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useAnalyticsQuery, useGenieChat } from '@databricks/appkit-ui/react';
import { MessageCircle, RotateCcw, Send, X } from 'lucide-react';
import { GENIE_ALIAS, type Features } from '@shared/features';
import { Pill } from './Pill';
import { NO_PARAMS, type RawRow } from './queryValues';
import {
  FOOTER,
  MAX_QUESTION_LENGTH,
  SLOW_AFTER_MS,
  dataDate,
  keyAction,
  toBlocks,
  failedMessageId,
  toChatItems,
  type Answer,
  type ChatItem,
} from './genieAnswer';

// "Ask HawkerReach" (Spec 6, #129): a floating Genie chat on every page, mounted once in the app shell.
// Not a page or a route; hidden entirely while HAWKERREACH_GENIE_ENABLED is off (GET /api/features).

const SUGGESTIONS = [
  { label: 'Seniors cut off if Kim Keat closes', question: 'How many seniors are cut off if Kim Keat Palm closes?' },
  {
    label: 'Top 5 closures in 2026',
    question: 'What are the top 5 works closures starting in 2026 by seniors cut off?',
  },
  { label: 'Closures per year', question: 'How many works closures were there per year from 2024 to 2026?' },
  { label: 'What pace do you assume for seniors?', question: 'What walking pace do you assume for seniors?' },
];

function useFeatures(): Features | null {
  const [features, setFeatures] = useState<Features | null>(null);
  useEffect(() => {
    let live = true;
    void fetch('/api/features')
      .then((r) => (r.ok ? (r.json() as Promise<Features>) : { genie: false }))
      .catch(() => ({ genie: false }))
      .then((f) => live && setFeatures(f));
    return () => {
      live = false;
    };
  }, []);
  return features;
}

export function AskHawkerReach() {
  return <ChatGate features={useFeatures()} />;
}

// Nothing at all until the server says the chat is on (#125, rule 4).
export function ChatGate({ features }: { features: Features | null }) {
  return features?.genie ? <Chat /> : null;
}

function Chat() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const { messages, status, sendMessage, reset } = useGenieChat({ alias: GENIE_ALIAS, persistInUrl: false });
  const date = useAnalyticsQuery('shared_data_date', NO_PARAMS);
  const waiting = status === 'streaming';
  const slow = useSlow(waiting);

  // The hook's error clears on the next question, so remember which answer it belonged to.
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(() => new Set());
  const failed = failedMessageId(messages, status);
  if (failed && !failedIds.has(failed)) setFailedIds(new Set([...failedIds, failed]));
  const newChat = () => {
    reset();
    setFailedIds(new Set());
  };

  // Escape closes the panel wherever focus is; closing returns focus to the chat button.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => {
    if (!open && wasOpen.current) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <>
      {/* Room at the end of the page, so the last row can scroll clear of the button. */}
      <div aria-hidden className="h-20 shrink-0" />
      {open ? (
        <ChatPanel
          items={toChatItems(messages, status, failedIds)}
          waiting={waiting}
          slow={slow}
          dateLine={dataDate((date.data as RawRow[] | null)?.[0]?.built_at)}
          onSend={sendMessage}
          onNewChat={newChat}
          onClose={() => setOpen(false)}
        />
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask HawkerReach"
          title="Ask HawkerReach"
          className="fixed bottom-6 right-6 z-50 inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <MessageCircle className="h-6 w-6" aria-hidden />
        </button>
      )}
    </>
  );
}

// True once a question has been waiting SLOW_AFTER_MS.
function useSlow(waiting: boolean): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => {
      clearTimeout(t);
      setSlow(false);
    };
  }, [waiting]);
  return waiting && slow;
}

interface ChatPanelProps {
  items: ChatItem[];
  waiting: boolean;
  slow: boolean;
  dateLine: string;
  onSend: (question: string) => void;
  onNewChat: () => void;
  onClose: () => void;
}

export function ChatPanel({ items, waiting, slow, dateLine, onSend, onNewChat, onClose }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // On open, and again once an answer is in.
  useEffect(() => {
    if (!waiting) inputRef.current?.focus();
  }, [waiting]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [items.length, waiting]);

  const send = (question: string) => {
    if (waiting || !question.trim()) return;
    onSend(question.trim());
    setDraft('');
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (keyAction(e.key, e.shiftKey, e.nativeEvent.isComposing) === 'send') {
      e.preventDefault();
      send(draft);
    }
  };

  return (
    <section
      role="dialog"
      aria-label="Ask HawkerReach"
      className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-xl border bg-card text-card-foreground shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[540px] sm:w-[380px] sm:rounded-xl"
    >
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <h2 className="text-base font-semibold">Ask HawkerReach</h2>
        <Pill tone="outline">Beta</Pill>
        <button
          type="button"
          onClick={onNewChat}
          className={`ml-auto ${ICON_BUTTON}`}
          aria-label="New chat"
          title="New chat"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={onClose} className={ICON_BUTTON} aria-label="Close" title="Close">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>
      <p className="border-b bg-muted px-4 py-2 text-xs text-muted-foreground">
        Answers come from HawkerReach&apos;s gold tables. Numbers are estimates.
      </p>

      <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {items.length === 0 && <Suggestions disabled={waiting} onPick={send} />}
        {/* Only the conversation is announced, not the suggestions. */}
        <div aria-live="polite" className="flex flex-col gap-3">
          {items.map((item) => (
            <ChatBubble key={item.id} item={item} slow={slow} dateLine={dateLine} />
          ))}
        </div>
      </div>

      <form
        className="flex items-end gap-2 border-t px-3 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={MAX_QUESTION_LENGTH}
          disabled={waiting}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Your question"
          placeholder="Ask about closures, seniors or demand"
          className="max-h-28 min-h-9 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={waiting || !draft.trim()}
          aria-label="Send"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </section>
  );
}

const ICON_BUTTON =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring';

function Suggestions({ disabled, onPick }: { disabled: boolean; onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">Try one of these:</p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s.question)}
            className="rounded-full border border-input bg-background px-3 py-1 text-left text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ item, slow, dateLine }: { item: ChatItem; slow: boolean; dateLine: string }) {
  if (item.kind === 'question') {
    return (
      <p className="ml-8 self-end whitespace-pre-wrap rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
        {item.text}
      </p>
    );
  }
  const bubble = 'mr-4 self-start rounded-lg rounded-bl-sm bg-muted px-3 py-2 text-sm';
  if (item.kind === 'pending') {
    return (
      <div className={bubble}>
        <span className="sr-only">Genie is answering</span>
        <span className="inline-flex gap-1" aria-hidden>
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        {slow && <span className="ml-2 text-muted-foreground">Still working...</span>}
      </div>
    );
  }
  if (item.kind === 'error') return <p className={`${bubble} text-destructive`}>{item.message}</p>;
  return <AnswerBubble className={bubble} answer={item.answer} dateLine={dateLine} />;
}

function AnswerBubble({ answer, className, dateLine }: { answer: Answer; className: string; dateLine: string }) {
  return (
    <div className={`${className} flex flex-col gap-2 leading-relaxed`}>
      {toBlocks(answer.text).map((block, i) =>
        block.kind === 'list' ? (
          <ul key={i} className="list-disc space-y-0.5 pl-5">
            {block.items.map((text, j) => (
              <li key={j}>{text}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{block.text}</p>
        )
      )}
      <p className="border-t border-border pt-1.5 text-[11px] leading-snug text-muted-foreground">
        {FOOTER} {dateLine}.
      </p>
    </div>
  );
}
