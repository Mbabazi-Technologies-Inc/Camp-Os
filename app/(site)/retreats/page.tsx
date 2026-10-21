import type { Metadata } from "next";
import {
  ArrowRight,
  Briefcase,
  Church,
  GraduationCap,
  MessageSquareText,
  SearchCheck,
  Sun,
  Trees,
  Users,
} from "lucide-react";
import { PageHero, Section, SectionHeading } from "@/components/site/Section";
import { Contours } from "@/components/site/Contours";
import { FactStrip } from "@/components/site/FactStrip";
import { camp, retreats, telHref } from "@/lib/site/content";
import { CampPhoto } from "@/components/site/CampPhoto";
import { photos } from "@/lib/site/photos";

export const metadata: Metadata = {
  title: "Retreat centre",
  description: `Host your group of ${retreats.capacity.min}-${retreats.capacity.max} at Mill Stream's retreat centre in Omemee, Ontario, ${retreats.season}.`,
};

// One icon per entry in retreats.groups, in order.
const groupIcons = [Church, GraduationCap, Users, Briefcase];

const booking = [
  { icon: MessageSquareText, title: "Tell us about your group", body: "Your group size and the dates you have in mind." },
  { icon: SearchCheck, title: "We check availability", body: "We'll get back to you with open dates and rates." },
  { icon: Trees, title: "Come to the river", body: "Arrive to accommodations, meeting space and 40 acres outside." },
];

const enquiryHref = `mailto:${camp.email}?subject=${encodeURIComponent("Retreat booking enquiry")}`;

export default function RetreatsPage() {
  const facts: [string, string][] = [
    ["Season", retreats.season],
    ["Group size", `${retreats.capacity.min}-${retreats.capacity.max} people`],
    ["Property", `${camp.acres} acres`],
  ];

  return (
    <>
      <PageHero
        eyebrow="Retreat centre"
        title="A peaceful place for your group to gather"
        photo={photos.bibleStudy}
        intro={`Outside of summer, Mill Stream opens its ${camp.acres} acres along the Pigeon River to churches, schools, families and ministries.`}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={enquiryHref}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 font-semibold text-white shadow-lg transition-colors hover:bg-accent/90"
          >
            Check dates <ArrowRight size={18} />
          </a>
          <a
            href={telHref(camp.phone)}
            className="inline-flex h-12 items-center rounded-full border border-white/50 bg-white/10 px-7 font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            Call {camp.phone}
          </a>
        </div>
      </PageHero>

      <FactStrip facts={facts} className="max-w-4xl" />

      {/* Who comes here */}
      <Section>
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Who comes here"
              title="Built for groups of every kind"
              intro="Accommodations, meeting space and a wide range of activities - with the river and forest just outside the door."
            />
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {retreats.groups.map((g, i) => {
                const Icon = groupIcons[i] ?? Users;
                return (
                  <li key={g} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-soft text-forest">
                      <Icon size={20} />
                    </span>
                    <span className="font-semibold leading-snug">{g}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="relative pb-16 sm:pb-20 sm:pl-16">
            <CampPhoto
              photo={photos.worship}
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="aspect-[4/3] rounded-3xl shadow-card-hover"
            />
            <CampPhoto
              photo={photos.smores}
              sizes="(min-width: 1024px) 22vw, 50vw"
              className="absolute bottom-0 left-0 aspect-square w-1/2 rounded-3xl border-[6px] border-surface shadow-card-hover"
            />
            <div className="absolute -right-2 top-6 rotate-3 rounded-xl bg-accent px-4 py-1.5 font-script text-2xl font-semibold text-white shadow-lg">
              {retreats.season}
            </div>
          </div>
        </div>

      </Section>

      {/* How booking works */}
      <div className="relative isolate overflow-hidden bg-[#0f2f37] text-white">
        <Contours className="absolute inset-0 -z-10 h-full w-full text-white/[0.06]" />
        <div className="reveal mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <p className="font-script text-2xl font-semibold leading-none text-glow sm:text-[1.7rem]">Booking a retreat</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-balance sm:text-[2.6rem] sm:leading-[1.15]">
                How booking works
              </h2>
              <p className="mt-4 leading-relaxed text-white/80">
                Tell us your group size and preferred dates, and we&apos;ll get back to you with availability and
                rates.
              </p>
            </div>
            <ol className="grid gap-4">
              {booking.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="relative flex items-center gap-5 rounded-2xl bg-white/[0.07] p-5 pr-16 ring-1 ring-white/10 sm:p-6 sm:pr-20">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0f2f37]/60 text-glow ring-2 ring-glow/40">
                    <Icon size={22} />
                  </span>
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-white/70">{body}</span>
                  </span>
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-display text-5xl font-semibold text-white/15" aria-hidden>
                    {i + 1}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <Section className="py-12 sm:py-16">
        <div className="mx-auto flex max-w-3xl items-start gap-4 rounded-2xl bg-accent-soft px-6 py-5">
          <Sun className="mt-0.5 shrink-0 text-[#9a5a12]" size={22} />
          <div>
            <p className="font-semibold text-[#7a4710]">Summer belongs to our campers</p>
            <p className="mt-0.5 text-sm text-[#7a4710]/85">{retreats.closed}</p>
          </div>
        </div>
      </Section>
    </>
  );
}
