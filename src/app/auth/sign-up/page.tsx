import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Tạo tài khoản · rentOS" };

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default function Page(props: AuthPageProps) {
  return (
    <Suspense fallback={null}>
      <AuthPage {...props} />
    </Suspense>
  );
}

async function AuthPage({ searchParams }: AuthPageProps) {
  const { next } = await searchParams;
  return (
    <AuthCard panel="signup">
      <SignUpForm next={typeof next === "string" ? next : null} />
    </AuthCard>
  );
}
