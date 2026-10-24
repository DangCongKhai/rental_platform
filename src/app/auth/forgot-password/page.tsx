import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Quên mật khẩu · rentOS" };

export default function Page() {
  return (
    <AuthCard panel="login">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
