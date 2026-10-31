"use client";
import { useState } from "react";
import Link from "next/link";
import {
  RentalRequestForm,
  type RequestProfile,
  type RequestListing,
} from "./rental-request-form";
export function RentalRequestScreen({
  listing,
  profile,
}: {
  listing: RequestListing;
  profile?: RequestProfile;
}) {
  const [unit, setUnit] = useState("");
  return (
    <section className="mx-auto my-8 w-full max-w-[640px] rounded-[15px] bg-white p-6 sm:p-8">
      <div className="mb-4 flex justify-between gap-4">
        <h1 className="text-[22px] font-bold">Gửi yêu cầu thuê</h1>
        <Link
          href={`/listings/${listing.id}`}
          className="text-sm text-[#3368a0]"
        >
          Đóng
        </Link>
      </div>
      <RentalRequestForm
        listing={listing}
        isSignedIn={!!profile}
        profile={profile}
        preferredUnitId={unit}
        onPreferredUnitChange={setUnit}
      />
    </section>
  );
}
