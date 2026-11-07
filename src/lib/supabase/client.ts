import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        // Recovery links arrive as ?code=. Exchanging that code is a login,
        // so the update-password form does it only after the new password is submitted.
        detectSessionInUrl: false,
      },
    },
  );
}
