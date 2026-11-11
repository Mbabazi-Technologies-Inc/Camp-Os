"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { SendHorizontal } from "lucide-react";

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

// The message box. Enter sends, Shift+Enter starts a new line; the form
// clears itself after each send.
export function Composer({ action, channelName }: { action: (formData: FormData) => Promise<void>; channelName: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
        document.getElementById("chat-end")?.scrollIntoView({ block: "end" });
      }}
      className="flex items-end gap-2 rounded-2xl border border-[#cfc7b9] bg-surface p-2 shadow-card focus-within:border-primary"
    >
      <label htmlFor="chat-body" className="sr-only">
        Message #{channelName}
      </label>
      <textarea
        id="chat-body"
        name="body"
        rows={1}
        required
        placeholder={`Message #${channelName}`}
        enterKeyHint="send"
        className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-foreground placeholder:text-muted focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (e.currentTarget.value.trim()) formRef.current?.requestSubmit();
          }
        }}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
        }}
      />
      <SendButton />
    </form>
  );
}
