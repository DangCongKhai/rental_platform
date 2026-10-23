import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Tạo tài khoản · rentOS" };

export default function Page() {
  return (
    <AuthCard panel="signup">
      <SignUpForm />
    </AuthCard>
  );
}
