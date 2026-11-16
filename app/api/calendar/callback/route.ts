import { NextResponse, type NextRequest } from "next/server";
import { requireWritableCamp } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { exchangeCodeForTokens } from "@/lib/google";
import { getCalendarAddress } from "@/lib/calendar";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.cookies.get("calendar_oauth_state")?.value;

  const fail = (message: string) =>
    NextResponse.redirect(
      new URL("/settings?error=" + encodeURIComponent(message), request.url)
    );

  if (!code || !state || !storedState || state !== storedState) {
    return fail("Calendar connection was cancelled or the request expired. Please try again.");
  }

  // Outside the try: its redirects (signed out, read-only camp) must not be
  // swallowed by the catch below.
  const { supabase, campId, userId, role } = await requireWritableCamp();
  if (role !== "director") return fail("Only directors can connect a calendar.");

  try {

    const redirectUri = new URL("/api/calendar/callback", request.url).toString();
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens.refresh_token) {
      return fail(
        `Google didn't grant offline access. Remove ${brand.name} from your Google account permissions and try connecting again.`
      );
    }

    const email = await getCalendarAddress(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Replace any earlier connection (members may only refresh tokens, so a
    // reconnect is a delete + insert, both director-only).
    await supabase.from("calendar_accounts").delete().eq("camp_id", campId);
    await supabase.from("retreat_groups").update({ google_event_id: null }).eq("camp_id", campId);
    const { error } = await supabase.from("calendar_accounts").insert({
      camp_id: campId,
      email,
      calendar_id: "primary",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      connected_by: userId,
    });
    if (error) return fail("Couldn't save the calendar connection. Please try again.");

    const response = NextResponse.redirect(
      new URL(
        "/settings?notice=" + encodeURIComponent(`Calendar connected: ${email}`),
        request.url
      )
    );
    response.cookies.delete("calendar_oauth_state");
    return response;
  } catch {
    return fail("Couldn't complete the calendar connection. Please try again.");
  }
}
