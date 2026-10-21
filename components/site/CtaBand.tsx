"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CampPhoto } from "./CampPhoto";
import { Treeline } from "./Treeline";
import { camp, retreats, telHref } from "@/lib/site/content";
import { photos } from "@/lib/site/photos";

const enquiryHref = `mailto:${camp.email}?subject=${encodeURIComponent("Retreat booking enquiry")}`;

// The closing invitation shown above the footer on every page. The retreat
// pages get their own version for groups; everywhere else invites campers.
const bands = {
  camp: {
    photo: photos.campfire,
    script: "See you by the fire",
    title: "Save your camper's spot this summer",
    body: `Overnight and day camps for ages 5-15, on ${camp.acres} acres along the Pigeon River.`,
    primary: { label: "Register for camp", href: camp.registrationUrl },
    secondary: { label: "Book a retreat", href: "/retreats" },
  },
  retreat: {
    photo: photos.waterfront,
    script: "Gather by the river",
    title: "Bring your group to Mill Stream",
    body: `Groups of ${retreats.capacity.min} to ${retreats.capacity.max}, ${retreats.season}, with ${camp.acres} acres of field and forest just outside the door.`,
    primary: { label: "Check dates", href: enquiryHref },
    secondary: { label: `Call ${camp.phone}`, href: telHref(camp.phone) },
  },
};

export function CtaBand() {
  const pathname = usePathname();
  const band = pathname.startsWith("/retreats") ? bands.retreat : bands.camp;
  const SecondaryLink = band.secondary.href.startsWith("/") ? Link : "a";

  return (
    <section className="relative isolate overflow-hidden text-white">
      <CampPhoto key={band.photo.src} photo={band.photo} sizes="100vw" className="absolute inset-0 -z-20" />
      <div className="absolute inset-0 -z-10 bg-[#0f2f37]/75" aria-hidden />
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-20 text-center sm:px-6 sm:pb-36 sm:pt-28">
        <p className="font-script text-3xl text-glow sm:text-4xl">{band.script}</p>
        <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{band.title}</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/85">{band.body}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <a
            href={band.primary.href}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 font-semibold text-white shadow-lg transition-colors hover:bg-accent/90"
          >
            {band.primary.label} <ArrowRight size={18} />
          </a>
          <SecondaryLink
            href={band.secondary.href}
            className="inline-flex h-12 items-center rounded-full border border-white/40 px-7 font-semibold text-white transition-colors hover:bg-white/10"
          >
            {band.secondary.label}
          </SecondaryLink>
        </div>
      </div>
      <Treeline className="absolute -bottom-px left-0 h-12 text-[#0f2f37] sm:h-16" />
    </section>
  );
}
