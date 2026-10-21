import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Phone } from "lucide-react";
import { PageHero, Section, SectionHeading } from "@/components/site/Section";
import { ProgramCard } from "@/components/site/ProgramCard";
import { FactStrip } from "@/components/site/FactStrip";
import { camp, programs, season, telHref } from "@/lib/site/content";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return programs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const program = programs.find((p) => p.slug === slug);
  if (!program) return {};
  return { title: `${program.name} (${program.ages})`, description: program.blurb };
}

export default async function ProgramPage({ params }: Params) {
  const { slug } = await params;
  const program = programs.find((p) => p.slug === slug);
  if (!program) notFound();

  const register = program.register ?? { label: "Register online", href: camp.registrationUrl };
  const others = programs.filter((p) => p.slug !== program.slug).slice(0, 3);
  const [lead, ...rest] = program.description;

  const facts: [string, string][] = [
    ["Ages", program.ages.replace(/^Ages /, "")],
    ["Type", program.kind],
    ["Next session", program.sessions[0]?.replace(/ - .*/, "") ?? "Coming soon"],
  ];
  if (program.price) facts.push(["From", `$${program.price.earlyBird}`]);

  return (
    <>
      <PageHero eyebrow={`Summer ${season.year}`} title={program.name} intro={program.blurb} photo={program.photo}>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <a
            href={register.href}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 font-semibold text-white shadow-lg transition-colors hover:bg-accent/90"
          >
            {register.label} <ArrowRight size={18} />
          </a>
          <Link
            href="/summer-camps"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} /> All summer camps
          </Link>
        </div>
      </PageHero>

      <FactStrip facts={facts} className={facts.length === 4 ? "max-w-5xl" : "max-w-4xl"} />

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <SectionHeading eyebrow={`About ${program.name}`} title="What the week looks like" />
            <p className="mt-6 font-display text-2xl leading-snug text-foreground">{lead}</p>
            <div className="mt-5 space-y-5 text-lg leading-relaxed text-foreground/85">
              {rest.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </div>
            <ul className="mt-10 grid gap-4 sm:grid-cols-3">
              {program.highlights.map((h) => (
                <li key={h} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-card">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-soft text-forest">
                    <Check size={18} />
                  </span>
                  <span className="font-semibold leading-snug">{h}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="h-fit overflow-hidden rounded-2xl border border-border bg-surface shadow-card lg:sticky lg:top-24">
            <div className="p-6">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                <CalendarDays size={19} className="text-primary" /> {season.year} sessions
              </h2>
              {program.sessions.length ? (
                <ul className="mt-4 space-y-2">
                  {program.sessions.map((s) => (
                    <li key={s} className="flex items-center gap-2.5 rounded-xl bg-surface-muted px-4 py-3 text-sm font-semibold">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  {`${season.year} dates are coming soon.`} Call or email us and we&apos;ll let you know.
                </p>
              )}
            </div>

            {program.price && (
              <div className="border-t border-border bg-forest-soft/50 p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-forest">
                  Early bird &middot; before {season.earlyBirdDeadline}
                </p>
                <p className="mt-1 flex items-baseline gap-3">
                  <span className="font-display text-4xl font-semibold text-forest">${program.price.earlyBird}</span>
                  <span className="text-sm text-muted">
                    ${program.price.regular} regular
                  </span>
                </p>
                <p className="mt-2 text-xs text-muted">
                  {program.price.unit}. {season.taxNote}
                </p>
              </div>
            )}

            <div className="border-t border-border p-6">
              <a
                href={register.href}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white transition-colors hover:bg-accent/90"
              >
                {register.label} <ArrowRight size={18} />
              </a>
              <a
                href={telHref(camp.phone)}
                className="mt-3 flex h-11 items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold transition-colors hover:bg-surface-muted"
              >
                <Phone size={15} className="text-primary" /> Questions? {camp.phone}
              </a>
            </div>
          </aside>
        </div>
      </Section>

      <Section className="bg-surface-muted/70">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Keep exploring" title="Other programs" />
          <Link
            href="/summer-camps"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            See all summer camps <ArrowRight size={16} />
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((p) => (
            <ProgramCard key={p.slug} program={p} />
          ))}
        </div>
      </Section>
    </>
  );
}
