import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Đăng nhập · rentOS" };

export default function Page() {
  return (
    <AuthCard panel="login">
      <LoginForm />
    </AuthCard>
  );
}
