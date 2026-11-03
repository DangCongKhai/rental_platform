"use client";

import { useEffect, useState } from "react";
import type { RequestProfile } from "@/components/listings/rental-request-form";
import { LoadingScreen } from "@/components/loading-screen";
import { ListingDetailView } from "@/components/listings/listing-detail";
import { photoSlides } from "@/components/listings/listing-format";
import {
  fetchListing,
  ListingUnavailableError,
  type ListingDetail,
} from "./listings-api";
import { UnavailableListing } from "./unavailable-listing";

export function ListingDetailScreen({
  id,
  isSignedIn,
  profile,
}: {
  id: string;
  isSignedIn: boolean;
  profile?: RequestProfile;
}) {
  const [loaded, setLoaded] = useState<{
    id: string;
    listing: ListingDetail | null;
    unavailable: boolean;
  } | null>(null);
  const listing = loaded?.id === id ? loaded.listing : null;
  const unavailable = loaded?.id === id ? loaded.unavailable : false;

  useEffect(() => {
    const controller = new AbortController();
    fetchListing(id, controller.signal)
      .then((body) => {
        if (!controller.signal.aborted)
          setLoaded({ id, listing: body.data, unavailable: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (
          error instanceof ListingUnavailableError ||
          error instanceof Error
        ) {
          setLoaded({ id, listing: null, unavailable: true });
        }
      });
    return () => controller.abort();
  }, [id]);

  if (unavailable) return <UnavailableListing />;
  if (!listing) return <LoadingScreen message="Đang tải thế giới cho bạn..." />;

  return (
    <ListingDetailView
      profile={profile}
      listing={listing}
      photos={Promise.resolve(photoSlides(listing))}
      isSignedIn={isSignedIn}
    />
  );
}
