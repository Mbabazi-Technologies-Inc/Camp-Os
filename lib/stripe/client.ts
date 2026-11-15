import "server-only";
import Stripe from "stripe";
import { brand } from "@/lib/brand";

let stripe: Stripe | null = null;

// Created lazily so builds and demo mode never need a key.
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  stripe ??= new Stripe(key, { appInfo: { name: brand.name } });
  return stripe;
}
