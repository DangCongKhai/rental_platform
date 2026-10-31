import Image from "next/image";
import { cn } from "@/lib/utils";

const PANELS = {
  login: {
    photo: "/images/auth/login.jpg",
    title: "Chào mừng bạn trở về.",
    text: "Những ngôi nhà bạn quan tâm và các hợp đồng đang chờ, luôn ở đây chờ bạn.",
  },
  signup: {
    photo: "/images/auth/sign-up.jpg",
    title: "Một nơi để thuộc về.",
    text: "Tạo tài khoản để gửi yêu cầu thuê, hoặc đăng tài sản cho thuê dài hạn.",
  },
};

type AuthCardProps = {
  panel?: keyof typeof PANELS;
  children: React.ReactNode;
};

/** Two-column auth card: photo panel on the left, form on the right. */
export function AuthCard({ panel = "login", children }: AuthCardProps) {
  const { photo, title, text } = PANELS[panel];

  return (
    <div className="flex w-full max-w-[960px] flex-wrap overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="relative min-h-[280px] flex-[1_1_360px] bg-ink text-white sm:min-h-[600px]">
        <Image
          src={photo}
          alt=""
          fill
          priority
          sizes="(min-width: 960px) 440px, 100vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,18,22,.15)_30%,rgba(9,18,22,.85))]"
        />
        <div className="absolute left-8 top-7 text-xs font-semibold uppercase tracking-[.08em]">
          Nơi để ở. Chọn để thuộc về.
        </div>
        <div className="absolute inset-x-8 bottom-8 flex flex-col gap-2.5">
          <div className="text-[34px] font-bold leading-10 tracking-[-.02em]">
            {title}
          </div>
          <div className="text-[15px] leading-[22px] text-on-dark">{text}</div>
          <div className="mt-1.5 h-0.5 w-11 bg-cherub" />
          <div className="text-[13px] text-on-dark-muted">
            Một tài khoản dùng cho cả tìm nhà và quản lý cho thuê.
          </div>
        </div>
      </div>
      <div className="flex flex-[1.2_1_400px] flex-col gap-4 px-6 py-10 sm:px-12 sm:py-11">
        {children}
      </div>
    </div>
  );
}

export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-[28px] font-bold leading-9 tracking-[-.02em]">
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

/** Round icon + heading + message, for "check your email"-style states. */
export function AuthStatus({
  icon,
  tone = "brand",
  title,
  children,
}: {
  icon: React.ReactNode;
  tone?: "brand" | "success";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <span
        className={cn(
          "inline-flex size-14 items-center justify-center rounded-full [&>svg]:size-6.5",
          tone === "success"
            ? "bg-success-soft text-success"
            : "bg-brand-soft text-brand",
        )}
      >
        {icon}
      </span>
      <h1 className="text-[28px] font-bold leading-9 tracking-[-.02em]">
        {title}
      </h1>
      <div className="text-sm text-muted">{children}</div>
    </>
  );
}

/** Disabled Google sign-in plus the "or use email" divider. */
export function SocialDivider() {
  return (
    <>
      <span
        aria-disabled="true"
        className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-[15px] bg-disabled px-5 text-[15px] font-semibold text-subtle"
      >
        G · Tiếp tục với Google · sắp ra mắt
      </span>
      <div className="flex items-center gap-3 text-[13px] text-subtle">
        <span className="h-px flex-1 bg-line" />
        hoặc dùng email
        <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}

export function AuthSwitch({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-center gap-1 text-sm text-muted">
      {children}
    </div>
  );
}

/** Supabase error messages are English; show Vietnamese copy for the common ones. */
export function authErrorMessage(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  switch (code) {
    case "invalid_credentials":
      return "Email hoặc mật khẩu không chính xác.";
    case "user_already_exists":
    case "email_exists":
      return "Email này đã được dùng cho một tài khoản khác.";
    case "weak_password":
      return "Mật khẩu quá yếu. Hãy dùng ít nhất 8 ký tự.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
    case "same_password":
      return "Mật khẩu mới phải khác mật khẩu cũ.";
    default:
      return error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
  }
}
