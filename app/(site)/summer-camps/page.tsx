import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, MousePointerClick, PiggyBank, Tent } from "lucide-react";
import { PageHero, Section, SectionHeading } from "@/components/site/Section";
import { ProgramCard } from "@/components/site/ProgramCard";
import { LeadershipCard } from "@/components/site/LeadershipCard";
import { camp, programs, season } from "@/lib/site/content";
import { photos } from "@/lib/site/photos";

export const metadata: Metadata = {
  title: "Summer camps",
  description: "Overnight and day camps for ages 5-15 at Mill Stream Bible Camp in Omemee, Ontario.",
};

const steps = [
  { icon: Tent, title: "Pick a program", body: "Overnight, day camp or specialty weeks for ages 5-15." },
  { icon: MousePointerClick, title: "Register online", body: "Sign up and pay securely on our registration site." },
  { icon: PiggyBank, title: "Save $30", body: `Early-bird pricing on every program before ${season.earlyBirdDeadline}.` },
];

export default function SummerCampsPage() {
  const priced = programs.filter((p) => p.price);

  return (
    <>
      <PageHero
        eyebrow={`Summer ${season.year}`}
        title="Summer camps"
        photo={photos.canoe}
        intro="Overnight and day camps for ages 5-15, plus Handi*Camp for young people with special needs. Every program is built around fun, friendship and the Bible."
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={camp.registrationUrl}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 font-semibold text-white shadow-lg transition-colors hover:bg-accent/90"
          >
            Register online <ArrowRight size={18} />
          </a>
          <a
            href="#fees"
            className="inline-flex h-12 items-center rounded-full border border-white/50 bg-white/10 px-7 font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            Dates &amp; fees
          </a>
        </div>
      </PageHero>

      {/* How registration works */}
      <div className="relative z-10 mx-auto -mt-6 max-w-5xl px-4 sm:px-6">
        <ol className="grid overflow-hidden rounded-2xl border border-border bg-surface shadow-card sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className={`flex gap-4 px-5 py-5 sm:px-6 ${i ? "border-t border-border sm:border-l sm:border-t-0" : ""}`}
            >
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-soft text-forest">
                <Icon size={20} />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
                  {i + 1}
                </span>
              </span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="mt-0.5 block text-sm leading-snug text-muted">{body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <Section>
        <SectionHeading
          eyebrow="Our programs"
          title="Find the right week for your camper"
          intro="From a first overnight at five to leadership training for teens - every program has its own pace, and the same caring counsellors."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <ProgramCard key={p.slug} program={p} />
          ))}
          <LeadershipCard />
        </div>
      </Section>

      <Section id="fees" className="scroll-mt-24 bg-surface-muted/70">
        <SectionHeading
          eyebrow="Dates & fees"
          title="Compare programs"
          intro={`Early-bird pricing applies to registrations before ${season.earlyBirdDeadline}. ${season.taxNote}`}
        />

        {/* Phones: one card per program */}
        <ul className="mt-10 space-y-4 md:hidden">
          {priced.map((p) => (
            <li key={p.slug} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/summer-camps/${p.slug}`} className="font-display text-xl font-semibold hover:text-primary">
                    {p.name}
                  </Link>
                  <p className="text-sm text-muted">
                    {p.ages} &middot; {p.kind}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-semibold text-forest">${p.price!.earlyBird}</p>
                  <p className="text-xs text-muted">early bird</p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-4 text-sm">
                <p className="flex items-start gap-1.5">
                  <CalendarDays size={15} className="mt-0.5 shrink-0 text-muted" />
                  {p.sessions.length ? p.sessions.join(", ") : <span className="text-muted">Dates coming soon</span>}
                </p>
                <p className="shrink-0 text-right text-muted">
                  ${p.price!.regular} regular
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Larger screens: a comparison table */}
        <div className="mt-10 hidden overflow-hidden rounded-2xl border border-border bg-surface shadow-card md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Program</th>
                <th className="px-5 py-3.5 font-semibold">Ages</th>
                <th className="px-5 py-3.5 font-semibold">Sessions</th>
                <th className="px-5 py-3.5 font-semibold">Early bird</th>
                <th className="px-5 py-3.5 font-semibold">Regular</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {priced.map((p) => (
                <tr key={p.slug} className="transition-colors hover:bg-surface-muted/50">
                  <td className="px-5 py-4 font-semibold">
                    <Link href={`/summer-camps/${p.slug}`} className="font-display text-base hover:text-primary">
                      {p.name}
                    </Link>
                    <span className="block text-xs font-normal text-muted">{p.kind}</span>
                  </td>
                  <td className="px-5 py-4">{p.ages}</td>
                  <td className="px-5 py-4">
                    {p.sessions.length ? p.sessions.join(", ") : <span className="text-muted">Coming soon</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-forest-soft px-2.5 py-1 font-semibold text-forest">
                      ${p.price!.earlyBird}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    ${p.price!.regular}
                    <span className="block text-xs text-muted">{p.price!.unit}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Questions about a program? Call us at{" "}
            <span className="font-semibold text-foreground">{camp.phone}</span> or email{" "}
            <a href={`mailto:${camp.email}`} className="font-semibold text-primary hover:underline">
              {camp.email}
            </a>
            .
          </p>
          <a
            href={camp.registrationUrl}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            Register online <ArrowRight size={16} />
          </a>
        </div>
      </Section>
    </>
  );
}
