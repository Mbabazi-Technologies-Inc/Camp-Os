import Link from "next/link";
import { ArrowRight, ArrowUpRight, Flame, Mail, Sun, Trees, type LucideIcon } from "lucide-react";
import { Treeline } from "@/components/site/Treeline";

export type HeroChip = { label: string; href: string; icon: LucideIcon; tone?: "urgent" | "normal" };
export type HeroStat = { label: string; value: string; sub?: string; href: string; progress?: number; alert?: boolean };
export type HeroNext = {
  kicker: string;
  title: string;
  when: string;
  detail: string;
  href: string;
  countdown: string | null;
};

/** The sky behind the greeting follows the time of day at camp. */
function skyFor(hour: number) {
  if (hour >= 5 && hour < 12) {
    return {
      name: "morning",
      sky: "linear-gradient(115deg,#11343d 0%,#1b5462 38%,#b9773f 76%,#f3c08a 100%)",
      orb: "radial-gradient(circle,#fff6df 0%,#ffd99a 45%,rgba(255,217,154,0) 70%)",
      orbTop: "58%",
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      name: "afternoon",
      sky: "linear-gradient(115deg,#0f3a46 0%,#16606f 40%,#3f9aa6 74%,#a6dbd2 100%)",
      orb: "radial-gradient(circle,#fffbea 0%,#fff1c4 30%,rgba(255,241,196,0) 68%)",
      orbTop: "14%",
      // High in the sky: sit left of the "Up next" card so it isn't hidden.
      high: true,
    };
  }
  if (hour >= 17 && hour < 21) {
    return {
      name: "evening",
      sky: "linear-gradient(115deg,#162236 0%,#2b3757 38%,#7b4f6c 72%,#e08b4b 100%)",
      orb: "radial-gradient(circle,#ffe2b8 0%,#f7a65f 45%,rgba(247,166,95,0) 70%)",
      orbTop: "62%",
    };
  }
  return {
    name: "night",
    sky: "linear-gradient(115deg,#0a141f 0%,#132238 50%,#22385a 100%)",
    orb: "radial-gradient(circle,#f4f1e6 0%,#d9d4c4 35%,rgba(217,212,196,0) 62%)",
    orbTop: "14%",
    high: true,
  };
}

/**
 * The top of Home: a camp scene whose sky follows the time of day, the
 * greeting, what needs you (as tappable chips), the one thing that can't
 * wait, what's up next, and the day's numbers along the water.
 */
export function HomeHero({
  hour,
  greeting,
  dateLabel,
  seasonLabel,
  summer,
  summary,
  chips,
  urgent,
  next,
  stats,
  showReviewInbox,
}: {
  hour: number;
  greeting: string;
  dateLabel: string;
  seasonLabel: string;
  summer: boolean;
  summary: string;
  chips: HeroChip[];
  urgent: { label: string; href: string } | null;
  next: HeroNext | null;
  stats: HeroStat[];
  showReviewInbox: boolean;
}) {
  const sky = skyFor(hour);
  return (
    <section
      className="relative isolate mb-6 overflow-hidden rounded-[28px] text-white shadow-[0_24px_60px_-28px_rgba(15,47,55,0.65)]"
      style={{ background: sky.sky }}
      aria-label="Today"
    >
      {/* Scene: sun or moon, stars at night, two ridges of pines and the lake */}
      <div
        aria-hidden
        className={`pointer-events-none absolute right-[6%] -translate-y-1/2 ${
          "high" in sky && sky.high
            ? "h-24 w-24 opacity-70 md:right-[19.5rem] md:h-28 md:w-28 md:opacity-80"
            : "h-36 w-36 opacity-80 md:right-[9%] md:h-56 md:w-56 md:opacity-100"
        }`}
        style={{ top: sky.orbTop, background: sky.orb }}
      />
      {sky.name === "night" && (
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-70" preserveAspectRatio="none">
          {[
            [8, 12], [18, 30], [27, 8], [41, 22], [52, 10], [63, 26], [71, 14], [86, 34], [93, 9], [34, 40], [58, 44], [77, 6],
          ].map(([x, y], i) => (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r={i % 3 === 0 ? 1.4 : 0.9} fill="#fff" opacity={0.5 + (i % 4) * 0.12} />
          ))}
        </svg>
      )}
      <Treeline className="pointer-events-none absolute inset-x-0 bottom-[118px] h-20 text-[#0b2129]/35 md:bottom-[96px]" />
      <Treeline flip={false} className="pointer-events-none absolute inset-x-0 bottom-[104px] h-14 scale-x-[-1] text-[#0b2129]/70 md:bottom-[84px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[108px] bg-gradient-to-b from-[#0d2a32]/90 to-[#0a2027] md:h-[88px]">
        <div className="absolute inset-x-[12%] top-3 h-px bg-white/10" />
        <div className="absolute inset-x-[30%] top-6 h-px bg-white/[0.07]" />
      </div>

      <div className="relative grid gap-5 px-5 pt-5 md:grid-cols-[minmax(0,1fr)_17rem] md:px-8 md:pt-7">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-white/80">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">
              {summer ? <Sun size={12} /> : <Trees size={12} />}
              {seasonLabel}
            </span>
            {dateLabel}
          </p>
          <h1 className="mt-2 font-display text-[2.1rem] font-semibold leading-[1.05] tracking-tight drop-shadow-sm md:text-5xl">
            {greeting}
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-white/85">{summary}</p>

          {chips.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {chips.map(({ label, href, icon: Icon, tone }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium backdrop-blur transition-colors ${
                      tone === "urgent"
                        ? "border-[#ffb38a]/50 bg-[#c2462f]/35 text-white hover:bg-[#c2462f]/50"
                        : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {urgent && (
            <Link
              href={urgent.href}
              className="group mt-3 flex max-w-xl items-center gap-3 rounded-2xl border border-white/20 bg-[#0b2129]/35 px-3.5 py-2.5 backdrop-blur transition-colors hover:bg-[#0b2129]/50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e8743f] text-white">
                <Flame size={16} />
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#ffcfa8]">Can&apos;t wait</span>
                <span className="line-clamp-2 text-white">{urgent.label}</span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}

          {/* On a phone, "Up next" is one line */}
          {next && (
            <Link
              href={next.href}
              className="mt-3 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-[#0b2129]/45 px-3.5 py-2.5 text-sm backdrop-blur md:hidden"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/65">Next</span>
              <span className="min-w-0 flex-1 truncate font-semibold text-white">{next.title}</span>
              <span className="shrink-0 text-xs text-white/75">
                {next.countdown ? `in ${next.countdown.replace(/ to go$/, "")}` : next.when}
              </span>
            </Link>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/email-assistant/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-white/90"
            >
              <Mail size={15} /> Paste an email
            </Link>
            {showReviewInbox && (
              <Link
                href="/email-assistant"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                Review inbox <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </div>

        {/* Up next */}
        {next ? (
          <Link
            href={next.href}
            className="group hidden self-start rounded-2xl border border-white/15 bg-[#0b2129]/50 p-4 shadow-lg backdrop-blur-md transition-colors hover:bg-[#0b2129]/60 md:block"
          >
            <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/70">
              {next.kicker}
              <ArrowUpRight size={14} className="opacity-60 transition-opacity group-hover:opacity-100" />
            </p>
            <p className="mt-1.5 font-display text-lg font-semibold leading-snug text-white">{next.title}</p>
            <p className="mt-0.5 text-sm text-white/80">{next.when}</p>
            {next.countdown && (
              <p className="mt-3 inline-flex items-baseline gap-1.5 rounded-xl bg-white/10 px-3 py-1.5">
                <span className="font-display text-2xl font-semibold leading-none text-white">{next.countdown.split(" ")[0]}</span>
                <span className="text-xs text-white/75">{next.countdown.split(" ").slice(1).join(" ")}</span>
              </p>
            )}
            <p className="mt-2 text-xs font-medium text-white/80">{next.detail}</p>
          </Link>
        ) : (
          <div className="hidden self-start rounded-2xl border border-white/15 bg-[#0b2129]/45 p-4 text-sm text-white/85 backdrop-blur-md md:block">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Up next</p>
            <p className="mt-1.5">Nothing booked in the next two weeks. A good time for projects.</p>
          </div>
        )}
      </div>

      {/* The day's numbers, along the water */}
      <div className="relative mt-5 grid grid-cols-3 md:mt-6 gap-2 px-3 pb-3 md:gap-3 md:px-6 md:pb-5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 transition-colors hover:bg-white/[0.12] md:px-4"
          >
            <p className="flex items-baseline gap-1.5">
              <span className={`font-display text-2xl font-semibold leading-none md:text-[28px] ${stat.alert ? "text-[#ffb38a]" : "text-white"}`}>
                {stat.value}
              </span>
              {stat.sub && <span className="truncate text-xs text-white/60">{stat.sub}</span>}
            </p>
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-white/70">
              {stat.label}
              <ArrowRight size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />
            </p>
            {stat.progress !== undefined && (
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/15">
                <span className="block h-full rounded-full bg-[#8fd19e]" style={{ width: `${stat.progress}%` }} />
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
