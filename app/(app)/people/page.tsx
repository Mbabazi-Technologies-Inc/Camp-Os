import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "People" };

export default function PeopleIndexPage() {
  redirect("/people/campers");
}
