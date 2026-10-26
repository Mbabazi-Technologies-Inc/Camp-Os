import { notFound } from "next/navigation";
import { BookOpen, Clock, Sparkles, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateKnowledgeEntry, deleteKnowledgeEntry } from "../actions";
import { Input, Textarea, Select, Label } from "@/components/ui/Field";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { BackLink, DangerZone, DetailGrid, MetaItem, ProfileHeader, SectionCard } from "@/components/ui/Detail";
import { formatRelativeTime } from "@/lib/dates";
import { KNOWLEDGE_CATEGORY_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function KnowledgeEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("knowledge_base")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!entry) notFound();

  const updateWithId = updateKnowledgeEntry.bind(null, entry.id);
  const deleteWithId = deleteKnowledgeEntry.bind(null, entry.id);

  return (
    <div>
      <BackLink href="/knowledge-base" label="Knowledge base" />
      <ProfileHeader
        title={entry.title}
        badge={<BookOpen size={24} />}
        tone="forest"
        meta={
          <>
            <MetaItem icon={<Tag size={14} />}>{KNOWLEDGE_CATEGORY_LABELS[entry.category]}</MetaItem>
            <MetaItem icon={<Clock size={14} />}>Updated {formatRelativeTime(entry.updated_at)}</MetaItem>
          </>
        }
      />

      <DetailGrid
        aside={
          <SectionCard title="How the AI uses this" description="Drafted replies can quote this entry when a parent asks about it.">
            <div className="flex items-start gap-2.5 rounded-xl bg-primary-soft p-3">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-primary" />
              <p className="line-clamp-6 whitespace-pre-wrap text-sm text-foreground">{entry.content}</p>
            </div>
            <p className="mt-3 text-xs text-muted">
              Write it exactly as you&apos;d want it explained to a parent - the AI only uses what&apos;s here.
            </p>
          </SectionCard>
        }
      >
        <SectionCard title="Edit entry">
          <form action={updateWithId} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={entry.title} required />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="category">Category</Label>
                <Select id="category" name="category" defaultValue={entry.category}>
                  {Object.entries(KNOWLEDGE_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="content">Details</Label>
              <Textarea id="content" name="content" rows={8} defaultValue={entry.content} required />
            </div>
            <SubmitButton pendingText="Saving...">Save changes</SubmitButton>
          </form>
        </SectionCard>
      </DetailGrid>

      <DangerZone description="The AI will no longer be able to use this entry when drafting replies.">
        <form action={deleteWithId}>
          <ConfirmButton confirmMessage="Delete this knowledge base entry? The AI will no longer be able to use it when drafting replies.">
            Delete entry
          </ConfirmButton>
        </form>
      </DangerZone>
    </div>
  );
}
