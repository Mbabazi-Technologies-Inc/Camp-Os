import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { requireWritableCamp } from "@/lib/auth";
import { buildCalendarAuthUrl, isCalendarConfigured } from "@/lib/calendar";

export async function GET(request: NextRequest) {
  if (!isCalendarConfigured()) {
    return NextResponse.redirect(
      new URL(
        "/settings?error=" +
          encodeURIComponent(
            "Google isn't configured yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
          ),
        request.url
      )
    );
  }

  // Signed in, camp not read-only, and a director: connected accounts are
  // director-only (also enforced by RLS on calendar_accounts).
  const { role } = await requireWritableCamp();
  if (role !== "director") {
    return NextResponse.redirect(
      new URL("/settings?error=" + encodeURIComponent("Only directors can connect a calendar."), request.url)
    );
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = new URL("/api/calendar/callback", request.url).toString();

  const response = NextResponse.redirect(buildCalendarAuthUrl(redirectUri, state));
  response.cookies.set("calendar_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
