import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Static assets and the generated icons/manifest skip the session check, so
// the login page can load its favicon before anyone signs in.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|icon$|apple-icon$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
