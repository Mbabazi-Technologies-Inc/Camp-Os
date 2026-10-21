import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CampPhoto } from "./CampPhoto";
import { leadership } from "@/lib/site/content";
import { photos } from "@/lib/site/photos";

// Photo card for the Leadership Training Program, shown alongside the program cards.
export function LeadershipCard() {
  return (
    <Link
      href="/leadership"
      className="group relative isolate flex min-h-80 flex-col justify-end overflow-hidden rounded-2xl p-6 text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <CampPhoto photo={photos.woods} sizes="(min-width: 1024px) 33vw, 100vw" className="absolute inset-0 -z-20" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0f2f37] via-[#0f2f37]/70 to-[#0f2f37]/20" />
      <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">Completed Grade 8</span>
      <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight">Leadership Training</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/85">
        A one-week program for teens ready to serve. Limited to {leadership.spots} participants.
      </p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-glow">
        Learn more <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
