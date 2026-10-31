"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { AuthHeading, authErrorMessage } from "./auth-card";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const mismatch = repeatPassword !== "" && password !== repeatPassword;

  const handleUpdatePassword = async (
    e: React.SubmitEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    if (password !== repeatPassword) return;
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      setError(authErrorMessage(error));
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpdatePassword} className="contents">
      <AuthHeading title="Đặt lại mật khẩu" />
      <Field
        id="password"
        label="Mật khẩu mới"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Field
        id="repeat-password"
        label="Nhập lại mật khẩu"
        type="password"
        autoComplete="new-password"
        required
        invalid={mismatch}
        value={repeatPassword}
        onChange={(e) => setRepeatPassword(e.target.value)}
      >
        {mismatch && (
          <div className="text-[13px] font-medium text-danger-ink">
            Mật khẩu nhập lại không khớp.
          </div>
        )}
      </Field>
      {error && (
        <Alert tone="neutral">
          {error}{" "}
          <Link
            href="/auth/forgot-password"
            className="font-semibold text-brand"
          >
            Gửi lại liên kết
          </Link>
        </Alert>
      )}
      <Button
        type="submit"
        variant={isLoading ? "disabled" : "primary"}
        disabled={isLoading || mismatch}
        className="w-full"
      >
        {isLoading ? "Đang lưu…" : "Lưu mật khẩu mới"}
      </Button>
    </form>
  );
}
