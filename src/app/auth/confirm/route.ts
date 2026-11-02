import { authErrorMessage } from "@/components/auth/auth-card";
import { safeNext } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next")) ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.redirect(
      failureRedirect(request, authErrorMessage(error)),
    );
  }

  return NextResponse.redirect(
    failureRedirect(request, "Liên kết xác nhận không hợp lệ."),
  );
}

function failureRedirect(request: NextRequest, message: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/error";
  url.search = "";
  url.searchParams.set("error", message);
  return url;
}
