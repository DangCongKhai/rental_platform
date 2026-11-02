import type { ReactNode } from "react";
import Link from "next/link";
import { paginationItems } from "./pagination-items";

export function PageLinks({
  page,
  total,
  pageSize,
  href,
}: {
  page: number;
  total: number;
  pageSize: number;
  href: (page: number) => string;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (lastPage <= 1) return null;
  return (
    <nav
      aria-label="Phân trang"
      className="flex w-fit items-center gap-1 rounded-full bg-surface-brand-soft px-2 py-1.5"
    >
      <PageControl
        label="Trang trước"
        href={page > 1 ? href(page - 1) : undefined}
      >
        <PageChevron direction="left" />
      </PageControl>
      {paginationItems(page, lastPage).map((item, index) => {
        if (item === "gap") {
          return (
            <span
              key={`gap-${index}`}
              className="px-1 text-sm text-muted"
              aria-hidden="true"
            >
              …
            </span>
          );
        }
        const selected = item === page;
        return (
          <Link
            key={item}
            href={href(item)}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex size-9 items-center justify-center rounded-full text-sm font-semibold ${selected ? "bg-action-primary text-white" : "text-heading hover:bg-surface-card"}`}
          >
            {item}
          </Link>
        );
      })}
      <PageControl
        label="Trang sau"
        href={page < lastPage ? href(page + 1) : undefined}
      >
        <PageChevron direction="right" />
      </PageControl>
    </nav>
  );
}

function PageControl({
  label,
  href,
  children,
}: {
  label: string;
  href?: string;
  children: ReactNode;
}) {
  const className =
    "inline-flex size-9 items-center justify-center rounded-full text-heading";
  if (!href) {
    return (
      <span aria-disabled="true" className={`${className} text-muted`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}

function PageChevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
      <path
        d={
          direction === "left"
            ? "M12.5 4.5 7 10l5.5 5.5"
            : "M7.5 4.5 13 10l-5.5 5.5"
        }
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
