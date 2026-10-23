import Image from "next/image";
import Link from "next/link";

/** White rentOS wordmark, for dark surfaces (navbar, footer). */
export function Logo({ linked = true }: { linked?: boolean }) {
  const img = (
    <Image
      src="/brand/logo-rentos-white.png"
      alt="rentOS"
      width={120}
      height={30}
      priority
      className="h-7.5 w-auto"
    />
  );

  if (!linked) return img;
  return (
    <Link
      href="/"
      aria-label="rentOS trang chủ"
      className="inline-flex min-h-11 items-center"
    >
      {img}
    </Link>
  );
}
