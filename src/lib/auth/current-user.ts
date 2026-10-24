import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export type CurrentUser = {
  email: string;
  name: string;
  initials: string;
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
  return letters.toUpperCase();
}

// Cached per request so the navbar and page sections share one lookup.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!hasEnvVars) return null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.email) return null;

  const fullName = claims.user_metadata?.full_name;
  const name =
    typeof fullName === "string" && fullName.trim()
      ? fullName.trim()
      : claims.email.split("@")[0];

  return { email: claims.email, name, initials: initialsOf(name) };
});
