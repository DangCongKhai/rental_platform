"use client";

import { safeNext } from "@/lib/auth/safe-next";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { ArrowRightIcon, MailIcon } from "@/components/ui/icons";
import {
  AuthHeading,
  AuthStatus,
  AuthSwitch,
  SocialDivider,
  authErrorMessage,
} from "./auth-card";
import { PasswordStrength } from "./password-strength";
import { ResendButton } from "./resend-button";

export function SignUpForm({ next }: { next?: string | null }) {
  const destination = safeNext(next);
  const loginHref = destination
    ? `/auth/login?next=${encodeURIComponent(destination)}`
    : "/auth/login";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSignUp = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}${destination ?? "/"}`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? error.code
          : null;
      if (code === "user_already_exists" || code === "email_exists") {
        setSent(true);
      } else {
        setError(authErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resend = async () => {
    await createClient().auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${destination ?? "/"}`,
      },
    });
  };

  if (sent) {
    return (
      <>
        <AuthStatus icon={<MailIcon />} title="Kiểm tra email của bạn">
          Chúng tôi đã gửi liên kết xác nhận tới <b>{email}</b>. Mở email và bấm
          vào liên kết để kích hoạt tài khoản.
        </AuthStatus>
        <ResendButton onResend={resend} />
        <AuthSwitch>
          Đã xác nhận?
          <Link
            href={loginHref}
            className="font-semibold text-brand hover:text-brand-deep"
          >
            Đăng nhập
          </Link>
        </AuthSwitch>
      </>
    );
  }

  return (
    <form onSubmit={handleSignUp} className="contents">
      <AuthHeading
        title="Tạo tài khoản"
        subtitle="Bắt đầu hành trình của bạn cùng rentOS."
      />
      <SocialDivider />
      {error && <Alert tone="error">{error}</Alert>}

      <Field
        id="full-name"
        label="Họ và tên"
        autoComplete="name"
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
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
      <Field
        id="password"
        label="Mật khẩu"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      >
        <PasswordStrength password={password} />
      </Field>

      <Checkbox name="terms" required>
        Tôi đồng ý với{" "}
        <Link href="/" className="text-brand hover:text-brand-deep">
          Điều khoản sử dụng
        </Link>{" "}
        và{" "}
        <Link href="/" className="text-brand hover:text-brand-deep">
          Chính sách bảo mật
        </Link>
      </Checkbox>

      <Button
        type="submit"
        size="lg"
        variant={isLoading ? "disabled" : "primary"}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
        {!isLoading && <ArrowRightIcon />}
      </Button>

      <AuthSwitch>
        Đã có tài khoản?
        <Link
          href={loginHref}
          className="font-semibold text-brand hover:text-brand-deep"
        >
          Đăng nhập
        </Link>
      </AuthSwitch>
    </form>
  );
}
