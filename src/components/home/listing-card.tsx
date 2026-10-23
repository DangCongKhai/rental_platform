import Image from "next/image";
import { PinIcon } from "@/components/ui/icons";
import type { Listing } from "./content";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(9,18,22,.05)]">
      <div className="relative h-55 bg-[#dde5ec]">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          sizes="(min-width: 1200px) 400px, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-0.75 text-[13px] font-semibold leading-5 text-success">
          {listing.availability}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-4.5 pb-4.5 pt-4">
        <div className="text-[22px] font-bold leading-7">
          {listing.price}
          <span className="text-sm font-medium text-subtle"> /tháng</span>
        </div>
        <div className="text-sm text-ink-3">
          <b>{listing.bedrooms}</b> · <b>{listing.bathrooms}</b> ·{" "}
          <b>{listing.area}</b> · {listing.type}
        </div>
        <h3 className="text-base font-semibold leading-[22px]">{listing.title}</h3>
        <div className="flex items-center gap-1.5 text-[13px] text-subtle">
          <PinIcon />
          {listing.location}
        </div>
      </div>
    </article>
  );
}
