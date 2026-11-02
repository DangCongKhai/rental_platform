import type { ReactNode } from "react";
import Link from "next/link";

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-brand"
    >
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}
