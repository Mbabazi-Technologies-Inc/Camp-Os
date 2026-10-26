import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  saveEmailDraft,
  regenerateDraft,
  deleteEmailDraft,
  acceptSuggestedTask,
} from "../actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EmailDraftEditor } from "@/components/email/EmailDraftEditor";
import { RegenerateForm } from "@/components/email/RegenerateForm";
import { formatDueDate, formatRelativeTime } from "@/lib/dates";
import { initials } from "@/lib/initials";
import {
  EMAIL_CATEGORY_LABELS,
  EMAIL_URGENCY_LABELS,
  EMAIL_URGENCY_STYLES,
} from "@/lib/labels";
import Link from "next/link";
import { Sparkles, ListTodo, Check, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmailDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: draft } = await supabase
    .from("email_drafts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!draft) notFound();

  const saveWithId = saveEmailDraft.bind(null, draft.id);
  const regenerateWithId = regenerateDraft.bind(null, draft.id);
  const deleteWithId = deleteEmailDraft.bind(null, draft.id);
  const acceptTaskWithId = acceptSuggestedTask.bind(null, draft.id);

  return (
    <div>
      <Link
        href="/email-assistant"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary"
      >
        <ArrowLeft size={15} /> All emails
      </Link>
      <PageHeader
        title={draft.sender_name || draft.sender_email || "Email"}
        description={draft.subject || draft.sender_email || undefined}
        action={
          draft.status !== "pending" ? (
            <Badge
              className={
                draft.status === "approved"
                  ? "bg-primary-soft text-primary"
                  : "bg-surface-muted text-muted"
              }
            >
              {draft.status === "approved" ? "Approved" : "Dismissed"}
            </Badge>
          ) : draft.urgency ? (
            <Badge className={EMAIL_URGENCY_STYLES[draft.urgency]}>
              {EMAIL_URGENCY_LABELS[draft.urgency]}
            </Badge>
          ) : undefined
        }
      />

      {error && (
        <p className="mb-4 rounded-lg bg-danger-soft text-danger text-sm px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <div>
      {draft.ai_summary && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-primary-soft px-4 py-3">
          <Sparkles size={16} className="text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">AI summary</p>
            <p className="text-sm text-foreground mt-0.5">{draft.ai_summary}</p>
            {draft.category && (
              <p className="text-xs text-muted mt-0.5">
                Filed under {EMAIL_CATEGORY_LABELS[draft.category]}
              </p>
            )}
          </div>
        </div>
      )}

      {draft.suggested_task_title && (
        <Card className="p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <ListTodo size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">
                  Suggested follow-up
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {draft.suggested_task_title}
                </p>
                {draft.suggested_task_due && (
                  <p className="text-xs text-muted mt-0.5">
                    {formatDueDate(draft.suggested_task_due).label}
                  </p>
                )}
              </div>
            </div>
            {draft.suggested_task_accepted ? (
              <Badge className="bg-primary-soft text-primary shrink-0">
                <Check size={12} className="mr-1" /> Added
              </Badge>
            ) : (
              <form action={acceptTaskWithId} className="shrink-0">
                <SubmitButton pendingText="Adding..." variant="secondary">
                  Add task
                </SubmitButton>
              </form>
            )}
          </div>
        </Card>
      )}

      <Card className="mb-4 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border bg-surface-muted/60 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
            {initials(draft.sender_name || draft.sender_email || "?")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {draft.sender_name || draft.sender_email || "Unknown sender"}
            </p>
            <p className="truncate text-xs text-muted">
              {draft.sender_email ?? "Pasted email"} &middot; {formatRelativeTime(draft.created_at)}
            </p>
          </div>
        </div>
        <p className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-foreground">
          {draft.original_email}
        </p>
      </Card>

        </div>
        <div className="lg:sticky lg:top-6">
      {draft.status === "pending" ? (
        <>
          <Card className="p-4 mb-4">
            <EmailDraftEditor
              key={draft.updated_at}
              initialDraft={draft.edited_draft ?? draft.ai_draft ?? ""}
              initialCategory={draft.category ?? "other"}
              initialUrgency={draft.urgency ?? "medium"}
              saveAction={saveWithId}
              isGmail={draft.source === "gmail"}
            />
          </Card>

          <Card className="p-4 mb-4">
            <p className="font-display text-lg font-semibold text-foreground mb-2">Not quite right?</p>
            <RegenerateForm regenerateAction={regenerateWithId} />
          </Card>
        </>
      ) : (
        <Card className="p-4 mb-4">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
            Final reply
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {draft.edited_draft ?? draft.ai_draft}
          </p>
        </Card>
      )}

        </div>
      </div>

      <form action={deleteWithId}>
        <ConfirmButton
          confirmMessage="Delete this email and its draft? This can't be undone."
          variant="ghost"
          className="text-danger"
        >
          Delete
        </ConfirmButton>
      </form>
    </div>
  );
}
