import { Suspense } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { safeNext } from "@/lib/auth/safe-next";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { LoadingScreen } from "@/components/loading-screen";

export const metadata: Metadata = { title: "Đăng nhập · rentOS" };

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default function Page(props: AuthPageProps) {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang kiểm tra phiên đăng nhập…"
          className="w-full min-h-[600px]"
        />
      }
    >
      <AuthPage {...props} />
    </Suspense>
  );
}

async function AuthPage({ searchParams }: AuthPageProps) {
  // Supabase session inspection may read the clock while resolving the cookie.
  // Keep it out of the static shell and avoid a prerender-time refresh loop.
  await connection();
  const { next } = await searchParams;
  const destination = safeNext(typeof next === "string" ? next : null);
  if (await getCurrentUser()) {
    let refererDestination: string | null = null;
    const requestHeaders = await headers();
    try {
      const referer = new URL(requestHeaders.get("referer") ?? "");
      const host =
        requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
      const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
      if (referer.origin === `${protocol}://${host}`) {
        refererDestination = safeNext(
          `${referer.pathname}${referer.search}${referer.hash}`,
        );
      }
    } catch {
      // Missing or malformed Referer: use the home page fallback.
    }
    redirect(destination ?? refererDestination ?? "/");
  }
  return (
    <AuthCard panel="login">
      <LoginForm next={destination} />
    </AuthCard>
  );
}
