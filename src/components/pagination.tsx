"use client";

import { paginationItems } from "@/components/pagination-items";

export function Pagination({
  current,
  lastPage,
  onSelect,
}: {
  current: number;
  lastPage: number;
  onSelect: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Phân trang"
      className="flex w-fit items-center gap-1 justify-self-end rounded-full bg-surface-brand-soft px-2 py-1.5"
    >
      <button
        type="button"
        aria-label="Trang trước"
        disabled={current <= 1}
        className="inline-flex size-9 items-center justify-center rounded-full text-heading disabled:text-muted"
        onClick={() => onSelect(current - 1)}
      >
        <PageChevron direction="left" />
      </button>
      {paginationItems(current, lastPage).map((item, index) => {
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
        const selected = item === current;
        return (
          <button
            key={item}
            type="button"
            aria-current={selected ? "page" : undefined}
            className={`inline-flex size-9 items-center justify-center rounded-full text-sm font-semibold ${selected ? "bg-action-primary text-white" : "text-heading hover:bg-surface-card"}`}
            onClick={() => onSelect(item)}
          >
            {item}
          </button>
        );
      })}
      <button
        type="button"
        aria-label="Trang sau"
        disabled={current >= lastPage}
        className="inline-flex size-9 items-center justify-center rounded-full text-heading disabled:text-muted"
        onClick={() => onSelect(current + 1)}
      >
        <PageChevron direction="right" />
      </button>
    </nav>
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
