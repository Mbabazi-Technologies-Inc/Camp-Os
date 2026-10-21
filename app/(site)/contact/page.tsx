import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Phone, Mail, ArrowRight, ArrowUpRight, Tent, Trees, Flag, HeartHandshake } from "lucide-react";
import { PageHero, Section, SectionHeading } from "@/components/site/Section";
import { FaqList } from "@/components/site/FaqList";
import { camp, telHref } from "@/lib/site/content";
import { photos } from "@/lib/site/photos";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${camp.name}: ${camp.address.street}, ${camp.address.city}, Ontario. ${camp.phone}.`,
};

const helpLinks = [
  { icon: Tent, title: "Register for summer camp", body: "Sign up online for any program.", href: camp.registrationUrl },
  { icon: Trees, title: "Book a retreat", body: "Groups of 20-110, September to June.", href: "/retreats" },
  { icon: Flag, title: "Leadership Training", body: "Request an application for teens.", href: "/leadership" },
  { icon: HeartHandshake, title: "Handi*Camp", body: "Overnight camp for young people with special needs.", href: "/summer-camps/handicamp" },
];

export default function ContactPage() {
  const items = [
    {
      icon: MapPin,
      label: "Visit",
      value: `${camp.address.street}, ${camp.address.city}, ${camp.address.province}`,
      sub: camp.address.region,
      href: camp.mapUrl,
      cta: "Get directions",
    },
    { icon: Phone, label: "Call", value: camp.phone, href: telHref(camp.phone), cta: "Call the office" },
    { icon: Mail, label: "Email", value: camp.email, href: `mailto:${camp.email}`, cta: "Send an email" },
  ];

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's talk camp"
        photo={photos.canoe}
        intro="Questions about registration, a retreat booking, or working with us this summer? We'd love to hear from you."
      />

      <div className="relative z-10 mx-auto -mt-6 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {items.map(({ icon: Icon, label, value, sub, href, cta }) => (
            <a
              key={label}
              href={href}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover md:flex-col md:gap-0 md:p-6"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest-soft text-forest">
                <Icon size={21} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col md:h-full">
                <span className="text-xs font-medium uppercase tracking-wider text-muted md:mt-5">{label}</span>
                <span className="mt-1 break-words font-display text-xl font-semibold">{value}</span>
                {sub && <span className="text-sm text-muted">{sub}</span>}
                <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold text-primary md:pt-6">
                  {cta} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </span>
            </a>
          ))}
        </div>
      </div>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Find us"
              title="On the banks of the Pigeon River"
              intro={`We're at ${camp.address.street} in ${camp.address.city} - in the Kawartha Lakes near Lindsay.`}
            />
            <div className="relative mt-8 aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-surface-muted shadow-card sm:aspect-[400/260]">
              <iframe
                src={camp.mapEmbedUrl}
                title={`Map showing ${camp.name} at ${camp.address.street}, ${camp.address.city}`}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <a
              href={camp.mapUrl}
              className="group mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-primary shadow-card transition-shadow hover:shadow-card-hover"
            >
              Get directions <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
          <div>
            <SectionHeading eyebrow="Quick links" title="How can we help?" />
            <ul className="mt-8 space-y-3">
              {helpLinks.map(({ icon: Icon, title, body, href }) => (
                <li key={title}>
                  <Link
                    href={href}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Icon size={20} />
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold">{title}</span>
                      <span className="block text-sm text-muted">{body}</span>
                    </span>
                    <ArrowRight size={17} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section className="bg-surface-muted/70">
        <div className="mx-auto max-w-3xl">
          <SectionHeading center eyebrow="Questions" title="Good to know" />
          <FaqList className="mt-10" />
        </div>
      </Section>
    </>
  );
}
