"use client";

import { safeNext } from "@/lib/auth/safe-next";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/alert";
import { Button, TextButton, buttonClass } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { ArrowRightIcon } from "@/components/ui/icons";
import {
  AuthHeading,
  AuthSwitch,
  SocialDivider,
  authErrorMessage,
} from "./auth-card";

type LoginError =
  | { kind: "credentials" }
  | { kind: "unconfirmed"; resent: boolean }
  | { kind: "other"; message: string };

export function LoginForm({ next }: { next?: string | null }) {
  const destination = safeNext(next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<LoginError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      // Full navigation leaves /auth/login. router.refresh() re-renders this
      // route while the session cookie is new, and the signed-in navbar then
      // aborts the prerender and fetches /auth/login again.
      window.location.assign(destination ?? "/");
      return;
    }

    setIsLoading(false);
    if (error.code === "invalid_credentials") setError({ kind: "credentials" });
    else if (error.code === "email_not_confirmed")
      setError({ kind: "unconfirmed", resent: false });
    else setError({ kind: "other", message: authErrorMessage(error) });
  };

  const resendConfirmation = async () => {
    const { error } = await createClient().auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${destination ?? "/"}`,
      },
    });
    setError(
      error
        ? { kind: "other", message: authErrorMessage(error) }
        : { kind: "unconfirmed", resent: true },
    );
  };

  return (
    <form onSubmit={handleLogin} className="contents">
      <AuthHeading
        title="Đăng nhập"
        subtitle="Tiếp tục hành trình của bạn cùng rentOS."
      />
      <SocialDivider />

      {error?.kind === "credentials" && (
        <Alert tone="error">Email hoặc mật khẩu không chính xác.</Alert>
      )}
      {error?.kind === "unconfirmed" && (
        <Alert tone="warning">
          <b className="text-[15px]">Vui lòng xác nhận email của bạn.</b>{" "}
          {error.resent ? (
            <>Chúng tôi vừa gửi lại liên kết tới {email}.</>
          ) : (
            <>
              Chúng tôi đã gửi liên kết tới {email}.{" "}
              <TextButton onClick={resendConfirmation}>
                Gửi lại email
              </TextButton>
            </>
          )}
        </Alert>
      )}
      {error?.kind === "other" && <Alert tone="error">{error.message}</Alert>}

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
        autoComplete="current-password"
        required
        invalid={error?.kind === "credentials"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Checkbox name="remember" defaultChecked>
          Ghi nhớ đăng nhập
        </Checkbox>
        <Link
          href="/auth/forgot-password"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:text-brand-deep"
        >
          Quên mật khẩu?
        </Link>
      </div>

      {isLoading ? (
        <span
          aria-disabled="true"
          aria-live="polite"
          className={buttonClass({
            variant: "disabled",
            size: "lg",
            className: "w-full",
          })}
        >
          Đang đăng nhập…
        </span>
      ) : (
        <Button type="submit" size="lg" className="w-full">
          Đăng nhập
          <ArrowRightIcon />
        </Button>
      )}

      <AuthSwitch>
        Chưa có tài khoản?
        <Link
          href={
            destination
              ? `/auth/sign-up?next=${encodeURIComponent(destination)}`
              : "/auth/sign-up"
          }
          className="font-semibold text-brand hover:text-brand-deep"
        >
          Tạo tài khoản
        </Link>
      </AuthSwitch>
    </form>
  );
}
