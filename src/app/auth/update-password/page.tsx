import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { LoadingScreen } from "@/components/loading-screen";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Đặt lại mật khẩu · rentOS" };

type AuthPageProps = {
  searchParams: Promise<{ code?: string | string[] }>;
};

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
      <UpdatePasswordPage {...props} />
    </Suspense>
  );
}

async function UpdatePasswordPage({ searchParams }: AuthPageProps) {
  const { code } = await searchParams;
  const hasRecoveryCode = typeof code === "string" && code.length > 0;
  // A recovery code still has to be exchanged. An ordinary session does not.
  if (!hasRecoveryCode && (await getCurrentUser())) redirect("/");
  return (
    <AuthCard panel="login">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
