"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { AuthHeading, AuthSwitch, authErrorMessage } from "./auth-card";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (
    e: React.SubmitEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // This URL must be allowed in Supabase Auth > URL Configuration > Redirect URLs.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? error.code
          : null;
      if (code === "user_not_found") {
        setSuccess(true);
      } else {
        setError(authErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleForgotPassword} className="contents">
      <AuthHeading
        title="Quên mật khẩu"
        subtitle="Nhập email của bạn, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
      />
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="ban@email.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <Alert tone="error">{error}</Alert>}
      <Button
        type="submit"
        variant={isLoading ? "disabled" : "primary"}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? "Đang gửi…" : "Gửi liên kết đặt lại"}
      </Button>
      {success && (
        <Alert tone="info">
          Nếu email này tồn tại trong hệ thống, bạn sẽ nhận được một liên kết để
          đặt lại mật khẩu trong vòng vài phút. Vui lòng kiểm tra hộp thư của
          bạn.
        </Alert>
      )}
      <AuthSwitch>
        Nhớ ra mật khẩu?
        <Link
          href="/auth/login"
          className="font-semibold text-brand hover:text-brand-deep"
        >
          Đăng nhập
        </Link>
      </AuthSwitch>
    </form>
  );
}
