"use client";
import { useState } from "react";
import Link from "next/link";
import type { Favourite } from "@/server/favourites";
import { ListingCardView } from "@/features/discovery/listing-card";
import { FavouriteButton } from "./favourite-button";

export function SavedListings({ favourites }: { favourites: Favourite[] }) {
  const [removed, setRemoved] = useState<string[]>([]);
  const visible = favourites.filter((row) => !removed.includes(row.propertyId));
  return (
    <section className="w-full max-w-[1280px] px-4 pt-7 pb-14 lg:px-8">
      <h1 className="text-[28px] font-bold leading-9 tracking-tight text-ink">
        Yêu thích
      </h1>
      <p className="mt-1 mb-[18px] text-sm text-subtle">
        {visible.length} tin đã lưu.
      </p>
      {visible.length === 0 ? (
        <div className="grid gap-3">
          <p>Bạn chưa lưu tin nào.</p>
          <Link href="/listings" className="font-semibold text-brand">
            Quay lại tìm nhà
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((row) =>
            row.available ? (
              <ListingCardView
                key={row.propertyId}
                listing={row.card}
                href={`/listings/${row.card.id}`}
                onFavouriteRemoved={() =>
                  setRemoved((current) => [...current, row.propertyId])
                }
              />
            ) : (
              <article
                key={row.propertyId}
                className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-6"
              >
                <p className="text-subtle">Tin đăng không còn khả dụng.</p>
                <FavouriteButton
                  propertyId={row.propertyId}
                  onRemoved={() =>
                    setRemoved((current) => [...current, row.propertyId])
                  }
                />
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}
