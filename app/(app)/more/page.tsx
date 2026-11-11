import Link from "next/link";
import { BookOpen, ChevronRight, LogOut, Settings, Trees, Users } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

const LINKS = [
  { href: "/groups", label: "Retreats", description: "Bookings and groups", icon: Trees },
  { href: "/people", label: "People", description: "Campers, guardians and staff", icon: Users },
  { href: "/knowledge-base", label: "Knowledge", description: "Policies, schedules and answers", icon: BookOpen },
  { href: "/settings", label: "Settings", description: "Camp, Gmail and your account", icon: Settings },
];

// The phone's "More" tab: everything that isn't in the bottom bar.
export default function MorePage() {
  return (
    <div>
      <PageHeader title="More" />
      <Card>
        <ul className="divide-y divide-border">
          {LINKS.map(({ href, label, description, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted/50">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">{label}</span>
                  <span className="block text-sm text-muted">{description}</span>
                </span>
                <ChevronRight size={18} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <form action={signOut} className="mt-4">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-sm font-medium text-danger"
        >
          <LogOut size={16} /> Sign out
        </button>
      </form>
    </div>
  );
}
