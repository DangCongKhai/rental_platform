import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { LISTINGS } from "./content";
import { ListingCard } from "./listing-card";
import { SectionHeading } from "./section-heading";

export function LatestListings() {
  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-18 pt-22 sm:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Bắt đầu xem nhà ngay"
          title="Hãy tìm ngôi nhà dành cho chính bạn."
          titleClassName="text-brand"
        >
          <div className="mt-1.5 text-sm text-subtle">
            Bài đăng mới nhất tại Đà Nẵng
          </div>
        </SectionHeading>
        <Link href="/" className={buttonClass({ variant: "secondary" })}>
          Xem tất cả
          <ArrowUpRightIcon />
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-6">
        {LISTINGS.map((listing) => (
          <ListingCard key={listing.title} listing={listing} />
        ))}
      </div>
    </section>
  );
}
