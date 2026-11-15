import type { Metadata } from "next";
import { requireCamp } from "@/lib/auth";
import { Settings2 as Settings2Icon } from "lucide-react";
import { isGmailConfigured } from "@/lib/gmail";
import { updateCampName, inviteMember, revokeInvite, disconnectGmail } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Field";
import { LinkButton } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { formatRelativeTime } from "@/lib/dates";
import { CreditCard, LogOut, Mail, Tent, UserPlus, UserRound, Users } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Settings" };

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { notice, error } = await searchParams;
  const { supabase, campId, role, userId, fullName, userEmail } = await requireCamp();

  const [{ data: camp }, { data: members }, { data: invites }, { data: gmailAccount }] =
    await Promise.all([
      supabase.from("camps").select("name").eq("id", campId).maybeSingle(),
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("camp_id", campId)
        .order("created_at", { ascending: true }),
      supabase
        .from("camp_invites")
        .select("*")
        .eq("camp_id", campId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("gmail_accounts")
        .select("email, last_synced_at, created_at")
        .eq("camp_id", campId)
        .maybeSingle(),
    ]);

  const isDirector = role === "director";
  const gmailConfigured = isGmailConfigured();

  return (
    <div>
      <PageHeader icon={Settings2Icon} eyebrow="Camp office" title="Settings" description="Your camp, your team, and connections." />

      {notice && (
        <p className="mb-4 rounded-lg bg-primary-soft text-primary text-sm px-3 py-2">{notice}</p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-danger-soft text-danger text-sm px-3 py-2">{error}</p>
      )}

      <section className="grid gap-3 border-t border-border py-6 first-of-type:border-t-0 first-of-type:pt-0 md:grid-cols-[14rem_1fr] md:gap-8">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <Tent size={17} className="text-forest" /> Camp
          </h2>
          <p className="mt-1 text-sm text-muted">The name staff see across the camp office and in drafted replies.</p>
        </div>
        <div className="min-w-0">
        <Card className="p-4">
          <form action={updateCampName} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <Label htmlFor="name">Camp name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={camp?.name ?? ""}
                disabled={!isDirector}
                required
              />
            </div>
            {isDirector && <SubmitButton pendingText="Saving...">Save</SubmitButton>}
          </form>
          {!isDirector && (
            <p className="text-xs text-muted mt-2">Only directors can rename the camp.</p>
          )}
        </Card>
        </div>
      </section>

      {isDirector && (
        <section className="grid gap-3 border-t border-border py-6 first-of-type:border-t-0 first-of-type:pt-0 md:grid-cols-[14rem_1fr] md:gap-8">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <CreditCard size={17} className="text-forest" /> Billing
            </h2>
            <p className="mt-1 text-sm text-muted">Your {brand.name} plan, free trial and payment details.</p>
          </div>
          <div className="min-w-0">
            <Card className="p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-foreground">Plan, free trial and payment details.</p>
              <LinkButton href="/settings/billing" size="sm" variant="secondary">
                Billing
              </LinkButton>
            </Card>
          </div>
        </section>
      )}

      <section className="grid gap-3 border-t border-border py-6 first-of-type:border-t-0 first-of-type:pt-0 md:grid-cols-[14rem_1fr] md:gap-8">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <Mail size={17} className="text-forest" /> Gmail
          </h2>
          <p className="mt-1 text-sm text-muted">Pull your inbox in automatically. Approved replies are saved as Gmail drafts, never sent.</p>
        </div>
        <div className="min-w-0">
        <Card className="p-4">
          {gmailAccount ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Mail size={15} className="text-primary" /> {gmailAccount.email}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {gmailAccount.last_synced_at
                    ? `Last synced ${formatRelativeTime(gmailAccount.last_synced_at)}`
                    : "Connected - not synced yet"}
                </p>
              </div>
              <form action={disconnectGmail}>
                <ConfirmButton
                  confirmMessage="Disconnect Gmail? Synced emails stay, but new ones won't be imported."
                  variant="secondary"
                >
                  Disconnect
                </ConfirmButton>
              </form>
            </div>
          ) : (
            <div>
              <p className="text-sm text-foreground">
                Connect the camp&apos;s Gmail inbox to import emails automatically and save
                approved replies straight into your Gmail drafts folder.
              </p>
              <p className="text-xs text-muted mt-1">
                {brand.name} only asks for read and draft permissions - it can never send email
                on your behalf.
              </p>
              <div className="mt-3">
                {gmailConfigured ? (
                  <LinkButton href="/api/gmail/connect" size="sm">
                    <Mail size={15} /> Connect Gmail
                  </LinkButton>
                ) : (
                  <p className="text-xs rounded-lg bg-warning-soft text-warning px-3 py-2 inline-block">
                    Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment to enable
                    this.
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>
        </div>
      </section>

      <section className="grid gap-3 border-t border-border py-6 first-of-type:border-t-0 first-of-type:pt-0 md:grid-cols-[14rem_1fr] md:gap-8">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <Users size={17} className="text-forest" /> Team
          </h2>
          <p className="mt-1 text-sm text-muted">Who can sign in to the camp office, and their role.</p>
        </div>
        <div className="min-w-0">
        <Card className="px-4 py-2 mb-3">
          <div className="divide-y divide-border">
            {(members ?? []).map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2.5">
                <p className="text-sm font-medium text-foreground">
                  {member.full_name || "Unnamed"}
                  {member.id === userId && <span className="text-muted font-normal"> (you)</span>}
                </p>
                <Badge
                  className={
                    member.role === "director"
                      ? "bg-primary-soft text-primary"
                      : "bg-surface-muted text-muted"
                  }
                >
                  {member.role === "director" ? "Director" : "Staff"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {isDirector && (
          <Card className="p-4">
            <form action={inviteMember} className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <Label htmlFor="email">Invite a teammate by email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="office@yourcamp.org"
                  required
                />
              </div>
              <SubmitButton pendingText="Inviting...">
                <UserPlus size={15} /> Invite
              </SubmitButton>
            </form>
            <p className="text-xs text-muted mt-2">
              When they create a {brand.name} account with this email, they&apos;ll join your camp
              automatically as staff.
            </p>

            {invites && invites.length > 0 && (
              <div className="mt-4 divide-y divide-border border-t border-border">
                {invites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm text-foreground">{invite.email}</p>
                      <p className="text-xs text-muted">
                        Invited {formatRelativeTime(invite.created_at)} - pending
                      </p>
                    </div>
                    <form action={revokeInvite.bind(null, invite.id)}>
                      <ConfirmButton
                        confirmMessage={`Revoke the invite for ${invite.email}?`}
                        variant="ghost"
                        className="text-danger"
                      >
                        Revoke
                      </ConfirmButton>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
        </div>
      </section>

      <section className="grid gap-3 border-t border-border py-6 md:grid-cols-[14rem_1fr] md:gap-8">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <UserRound size={17} className="text-forest" /> Account
          </h2>
          <p className="mt-1 text-sm text-muted">Signed in to the camp office on this device.</p>
        </div>
        <div className="min-w-0">
          <Card className="flex items-center justify-between gap-3 p-4">
            <p className="min-w-0 truncate text-sm font-medium text-foreground">{userEmail ?? fullName ?? "Signed in"}</p>
            <form action={signOut}>
              <SubmitButton pendingText="Signing out..." variant="secondary">
                <LogOut size={15} /> Sign out
              </SubmitButton>
            </form>
          </Card>
        </div>
      </section>
    </div>
  );
}
