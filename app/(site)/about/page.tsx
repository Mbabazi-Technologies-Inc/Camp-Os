import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, Church, Home, ShieldCheck, HandHeart } from "lucide-react";
import { PageHero, Section, SectionHeading } from "@/components/site/Section";
import { camp, retreats } from "@/lib/site/content";
import { CampPhoto } from "@/components/site/CampPhoto";
import { photos } from "@/lib/site/photos";

export const metadata: Metadata = {
  title: "About",
  description: `${camp.name} has served children and families from the Pigeon River in Omemee, Ontario since ${camp.founded}.`,
};

// One entry per item in camp.mandate, in order.
const mandateDetails = [
  { icon: Heart, body: "Summer camps where kids hear the good news of Jesus in a way they can understand." },
  { icon: Church, body: `A retreat centre where churches and ministries can gather, ${retreats.season}.` },
  { icon: Home, body: "Programs for every age and stage, including Handi*Camp for young people with special needs." },
];

export default function AboutPage() {
  const numbers = [
    [String(camp.founded), "Founded"],
    [String(camp.acres), "Acres on the river"],
    ["5-15", "Camper ages"],
    [`${retreats.capacity.min}-${retreats.capacity.max}`, "Retreat guests"],
  ];

  return (
    <>
      <PageHero
        eyebrow="About Mill Stream"
        title={`Serving kids and families since ${camp.founded}`}
        photo={photos.friends}
        intro={`${camp.name} is a Bible-based, non-denominational camp on ${camp.acres} acres along the Pigeon River in ${camp.address.city}, Ontario.`}
      />

      {/* Our story */}
      <Section>
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Our story" title="A place to discover, belong and grow" />
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-foreground/85">
              <p className="font-display text-2xl leading-snug text-foreground">
                For generations, Mill Stream has been a place where children discover the outdoors, make
                lifelong friends, and hear the good news of Jesus in a way they can understand.
              </p>
              <p>
                The camp is owned and operated by {camp.owner} Alongside our summer programs, we run a
                year-round retreat centre and host Handi*Camp, an overnight camp for young people with special
                needs.
              </p>
            </div>
          </div>
          <div className="relative pb-16 sm:pb-20 sm:pr-16">
            <CampPhoto
              photo={photos.crafts}
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="aspect-[4/3] rounded-3xl shadow-card-hover"
            />
            <CampPhoto
              photo={photos.woods}
              sizes="(min-width: 1024px) 22vw, 50vw"
              className="absolute bottom-0 right-0 aspect-square w-1/2 rounded-3xl border-[6px] border-surface shadow-card-hover"
            />
            <div className="absolute -left-2 top-6 -rotate-3 rounded-xl bg-accent px-4 py-1.5 font-script text-2xl font-semibold text-white shadow-lg">
              Est. {camp.founded}
            </div>
          </div>
        </div>

        <dl className="mt-16 grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-card md:grid-cols-4">
          {numbers.map(([value, label], i) => (
            <div
              key={label}
              className={`flex flex-col-reverse px-4 py-6 text-center ${i % 2 ? "border-l border-border" : ""} ${i >= 2 ? "border-t border-border md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}
            >
              <dt className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">{label}</dt>
              <dd className="font-display text-3xl font-semibold text-primary sm:text-4xl">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Mandate */}
      <Section className="bg-surface-muted/70">
        <SectionHeading center eyebrow="Our mandate" title="Why we do what we do" />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {camp.mandate.map((m, i) => {
            const { icon: Icon, body } = mandateDetails[i];
            return (
              <div key={m} className="relative overflow-hidden rounded-2xl bg-surface p-8 shadow-card">
                <span className="absolute right-6 top-5 font-display text-6xl font-semibold text-surface-muted" aria-hidden>
                  {i + 1}
                </span>
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-forest-soft text-forest">
                  <Icon size={22} />
                </span>
                <h3 className="relative mt-5 font-display text-2xl font-semibold tracking-tight">{m}</h3>
                <p className="relative mt-2 leading-relaxed text-muted">{body}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Trust */}
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative isolate overflow-hidden rounded-3xl bg-stream p-8 text-white shadow-card sm:p-10">
            <ShieldCheck size={30} className="text-glow" />
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight">An accredited camp</h2>
            <p className="mt-3 leading-relaxed text-white/85">
              Mill Stream is accredited by the {camp.accreditations.join(" and ")}, meeting recognized standards
              for safety, staffing and program quality.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {camp.accreditations.map((a) => (
                <li key={a} className="rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold backdrop-blur">
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-surface p-8 shadow-card sm:p-10">
            <HandHeart size={30} className="text-forest" />
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight">Everyone is welcome</h2>
            <p className="mt-3 leading-relaxed text-muted">
              We are a Bible-based, non-denominational camp, and campers of every background are welcome. Mill
              Stream is owned and operated by {camp.owner}
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
            >
              Get in touch <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
