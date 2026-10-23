import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = { title: "Đặt lại mật khẩu · rentOS" };

export default function Page() {
  return (
    <AuthCard panel="login">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
