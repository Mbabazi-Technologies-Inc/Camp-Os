// A stand-in for the Supabase client used when no database is configured.
// Only the surface the app actually calls is implemented.

import { demoFrom, ensureDemoStaffLogin } from "./store";
import { DEMO_EMAIL, DEMO_FULL_NAME, DEMO_USER_ID } from "./seed";

export const DEMO_COOKIE = "millstream_demo";
// Holds a staff record id while the director looks at the app as that person.
export const DEMO_VIEW_AS_COOKIE = "millstream_demo_view_as";

export const DEMO_USER = {
  id: DEMO_USER_ID,
  email: DEMO_EMAIL,
  user_metadata: { full_name: DEMO_FULL_NAME },
};

/**
 * `signedIn` comes from the demo session cookie, so the login screen is still
 * part of the walkthrough instead of being skipped.
 */
export function createDemoClient(signedIn: boolean, viewAsStaffId?: string | null) {
  // "View as" swaps the signed-in user for that staff member's own login.
  const viewAs = viewAsStaffId ? ensureDemoStaffLogin(viewAsStaffId) : null;
  const user = viewAs ?? DEMO_USER;
  return {
    from: (table: string) => demoFrom(table),
    auth: {
      async getUser() {
        return {
          data: { user: signedIn ? user : null },
          error: null,
        };
      },
      async signInWithPassword() {
        return { data: { user: DEMO_USER, session: { user: DEMO_USER } }, error: null };
      },
      async signUp() {
        return { data: { user: DEMO_USER, session: { user: DEMO_USER } }, error: null };
      },
      async signOut() {
        return { error: null };
      },
    },
  };
}
