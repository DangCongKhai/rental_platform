"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/server/profile";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function ProfileForm({
  profile,
}: {
  profile: {
    fullName: string;
    phone: string;
    email: string;
    updatedAt: string;
  };
}) {
  const [updatedAt, setUpdatedAt] = useState(profile.updatedAt);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(async () => {
          setMessage("");
          setError("");
          try {
            const result = await updateProfile({
              fullName: data.get("fullName"),
              phone: data.get("phone"),
              updatedAt,
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            if (result.data) setUpdatedAt(result.data.updatedAt);
            setMessage("Đã lưu thay đổi.");
          } catch {
            setError("Không thể lưu hồ sơ. Vui lòng thử lại.");
          }
        });
      }}
      className="flex flex-col gap-[18px] rounded-[15px] border border-line bg-white p-6"
    >
      {message && <Alert tone="info">{message}</Alert>}
      {error && (
        <Alert tone="error">
          {error}{" "}
          {error.startsWith("Trang đã cũ") && (
            <button
              type="button"
              className="underline"
              onClick={() => window.location.reload()}
            >
              Tải lại
            </button>
          )}
        </Alert>
      )}
      <Field
        id="fullName"
        name="fullName"
        label="Họ và tên"
        defaultValue={profile.fullName}
        required
        maxLength={120}
        autoComplete="name"
      />
      <Field
        id="phone"
        name="phone"
        label="Số điện thoại"
        type="tel"
        defaultValue={profile.phone}
        maxLength={30}
        autoComplete="tel"
        aria-describedby="phone-hint"
      >
        <p id="phone-hint" className="text-[13px] text-subtle">
          Số liên hệ, chưa xác minh. Chủ nhà sẽ liên lạc với bạn qua số này.
        </p>
      </Field>
      <Field
        id="email"
        label="Email"
        value={profile.email}
        readOnly
        className="bg-[#f1f3f6] text-muted"
        aria-describedby="email-hint"
      >
        <p id="email-hint" className="text-[13px] text-subtle">
          Email đăng nhập, không thể thay đổi tại đây.
        </p>
      </Field>
      <div className="flex flex-wrap justify-between gap-3 border-t border-line-soft pt-4">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          className="border-[#f1b8b2] text-danger"
          onClick={() =>
            startTransition(async () => {
              await createClient().auth.signOut();
              router.push("/");
              router.refresh();
            })
          }
        >
          Đăng xuất
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}
