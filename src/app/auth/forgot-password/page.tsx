import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { LoadingScreen } from "@/components/loading-screen";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Quên mật khẩu · rentOS" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang kiểm tra phiên đăng nhập…"
          className="w-full min-h-[600px]"
        />
      }
    >
      <ForgotPasswordPage />
    </Suspense>
  );
}

async function ForgotPasswordPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <AuthCard panel="login">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
