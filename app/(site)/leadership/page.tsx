import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Flag, HeartHandshake, Mail } from "lucide-react";
import { PageHero, Section, SectionHeading } from "@/components/site/Section";
import { FactStrip } from "@/components/site/FactStrip";
import { CampPhoto } from "@/components/site/CampPhoto";
import { camp, leadership, season } from "@/lib/site/content";
import { photos } from "@/lib/site/photos";

export const metadata: Metadata = {
  title: "Leadership training",
  description: "A one-week leadership training program at Mill Stream for teens who have completed Grade 8.",
};

const learn = [
  { icon: Flag, title: "Leading activities", body: "Running games and programs so every camper can join in." },
  { icon: HeartHandshake, title: "Caring for kids", body: "Learning what it takes to serve campers well." },
  { icon: BookOpen, title: "Growing in faith", body: "Time in God's Word for your own walk, not just for leading." },
];

const applyHref = `mailto:${camp.email}?subject=${encodeURIComponent("Leadership Training application")}`;

export default function LeadershipPage() {
  const [lead, ...rest] = leadership.description;
  const facts: [string, string][] = [
    ["Who", "Completed Grade 8"],
    ["Length", leadership.length],
    ["Spots", `Only ${leadership.spots}`],
  ];

  return (
    <>
      <PageHero
        eyebrow={`Summer ${season.year}`}
        title={leadership.name}
        photo={photos.hiking}
        intro="For teens who loved being campers and are ready to learn what it takes to lead."
      >
        <a
          href={applyHref}
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 font-semibold text-white shadow-lg transition-colors hover:bg-accent/90"
        >
          Request an application <ArrowRight size={18} />
        </a>
      </PageHero>

      <FactStrip facts={facts} className="max-w-4xl" />

      <Section>
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Ready to lead" title="From camper to leader" />
            <p className="mt-6 font-display text-2xl leading-snug text-foreground">{lead}</p>
            <div className="mt-5 space-y-5 text-lg leading-relaxed text-foreground/85">
              {rest.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </div>
          </div>
          <div className="relative pb-16 sm:pb-20 sm:pr-16">
            <CampPhoto
              photo={photos.woods}
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="aspect-[4/3] rounded-3xl shadow-card-hover"
            />
            <CampPhoto
              photo={photos.worship}
              sizes="(min-width: 1024px) 22vw, 50vw"
              className="absolute bottom-0 right-0 aspect-square w-1/2 rounded-3xl border-[6px] border-surface shadow-card-hover"
            />
            <div className="absolute -left-2 top-6 -rotate-3 rounded-xl bg-accent px-4 py-1.5 font-script text-2xl font-semibold text-white shadow-lg">
              Only {leadership.spots} spots
            </div>
          </div>
        </div>
      </Section>

      <Section className="bg-surface-muted/70">
        <SectionHeading center eyebrow="The week" title="What you'll learn" />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {learn.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl bg-surface p-8 shadow-card">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-soft text-forest">
                <Icon size={22} />
              </span>
              <h3 className="mt-5 font-display text-2xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-8 rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="font-script text-2xl font-semibold leading-none text-forest sm:text-[1.7rem]">How to apply</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Spots are limited to {leadership.spots}</h2>
            <p className="mt-4 leading-relaxed text-muted">
              An application is required. Email us to request one, and we&apos;ll send it along with everything
              you need to know. Many campers from{" "}
              <Link href="/summer-camps/trailblazin-camp" className="font-semibold text-primary hover:underline">
                Trailblazin&apos; Camp
              </Link>{" "}
              go on to Leadership Training.
            </p>
          </div>
          <div className="space-y-3">
            <a
              href={applyHref}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white transition-colors hover:bg-accent/90"
            >
              Request an application <ArrowRight size={18} />
            </a>
            <p className="flex items-center justify-center gap-2 text-sm text-muted">
              <Mail size={15} className="text-primary" /> {camp.email}
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
