import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, AuthStatus } from "@/components/auth/auth-card";
import { buttonClass } from "@/components/ui/button";
import { AlertIcon } from "@/components/ui/icons";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return params?.error ? (
    <>Mã lỗi: {params.error}</>
  ) : (
    <>Đã xảy ra lỗi không xác định.</>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <AuthCard panel="login">
      <AuthStatus icon={<AlertIcon />} title="Xin lỗi, đã có lỗi xảy ra">
        <Suspense>
          <ErrorContent searchParams={searchParams} />
        </Suspense>
      </AuthStatus>
      <Link href="/auth/login" className={buttonClass()}>
        Quay lại đăng nhập
      </Link>
    </AuthCard>
  );
}
