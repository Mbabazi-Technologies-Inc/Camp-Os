"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AtSign, Megaphone, SendHorizontal } from "lucide-react";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Send message"
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
    >
      <SendHorizontal size={15} />
      <span className="hidden sm:inline">{pending ? "Sending" : "Send"}</span>
    </button>
  );
}

type Person = { name: string; detail: string };

/** The "@partial" being typed just before the cursor, if any. */
function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const match = /(^|\s)@([A-Za-z][\w'-]*(?: [A-Za-z][\w'-]*)?)?$/.exec(before);
  if (!match) return null;
  return { start: caret - (match[2]?.length ?? 0) - 1, query: (match[2] ?? "").toLowerCase() };
}

/**
 * The message box. Enter sends and Shift+Enter starts a new line. Typing @
 * suggests people to mention (arrow keys and Enter or Tab to pick), so a
 * mention always matches someone's name and shows up on their Home page.
 */
export function Composer({
  action,
  placeholder,
  people,
  inputId = "chat-body",
  canAnnounce = false,
}: {
  action: (formData: FormData) => Promise<void>;
  placeholder: string;
  people: Person[];
  inputId?: string;
  /** The director can post an announcement everyone has to confirm. */
  canAnnounce?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [active, setActive] = useState(0);

  const matches = mention
    ? people
        .filter((p) => p.name.toLowerCase().split(" ").some((part) => part.startsWith(mention.query)) || p.name.toLowerCase().startsWith(mention.query))
        .slice(0, 6)
    : [];

  function resize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function pick(person: Person) {
    const box = boxRef.current;
    if (!box || !mention) return;
    const caret = box.selectionStart;
    const next = `${box.value.slice(0, mention.start)}@${person.name} ${box.value.slice(caret)}`;
    box.value = next;
    const at = mention.start + person.name.length + 2;
    box.setSelectionRange(at, at);
    box.focus();
    setMention(null);
    resize(box);
  }

  return (
    <div className="relative">
      {matches.length > 0 && (
        <ul
          role="listbox"
          aria-label="People to mention"
          className="absolute bottom-full left-0 mb-2 w-72 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-dock"
        >
          {matches.map((person, i) => (
            <li key={person.name} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(person);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${i === active ? "bg-primary-soft" : "hover:bg-surface-muted"}`}
              >
                <AtSign size={14} className="shrink-0 text-muted" />
                <span className="font-medium text-foreground">{person.name}</span>
                <span className="truncate text-xs text-muted">{person.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        ref={formRef}
        action={async (formData) => {
          await action(formData);
          formRef.current?.reset();
          if (boxRef.current) resize(boxRef.current);
          setMention(null);
        }}
        className="flex items-end gap-2 rounded-2xl border border-[#cfc7b9] bg-surface p-2 shadow-card focus-within:border-primary"
      >
        <label htmlFor={inputId} className="sr-only">
          {placeholder}
        </label>
        <textarea
          ref={boxRef}
          id={inputId}
          name="body"
          rows={1}
          required
          placeholder={placeholder}
          enterKeyHint="send"
          autoComplete="off"
          className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-foreground placeholder:text-muted focus:outline-none"
          onKeyDown={(e) => {
            if (matches.length > 0) {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => (a + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                pick(matches[Math.min(active, matches.length - 1)]);
                return;
              }
              if (e.key === "Escape") {
                setMention(null);
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (e.currentTarget.value.trim()) formRef.current?.requestSubmit();
            }
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            resize(el);
            setMention(mentionAt(el.value, el.selectionStart));
            setActive(0);
          }}
          onBlur={() => setMention(null)}
        />
        {canAnnounce && (
          <label
            title="Announcement: everyone is asked to confirm they've read it"
            className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-muted hover:bg-surface-muted has-[:checked]:bg-accent-soft has-[:checked]:text-warning"
          >
            <input type="checkbox" name="announce" className="peer sr-only" />
            <Megaphone size={15} />
            <span className="hidden md:inline">Announce</span>
          </label>
        )}
        <SendButton />
      </form>
    </div>
  );
}
