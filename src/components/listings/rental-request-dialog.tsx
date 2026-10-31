"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { ListingDetail } from "@/features/discovery/listings-api";
import { RentalRequestForm, type RequestProfile } from "./rental-request-form";

export function RentalRequestDialog({
  listing,
  isSignedIn,
  profile,
  preferredUnitId,
  onPreferredUnitChange,
  onClose,
}: {
  listing: ListingDetail;
  isSignedIn: boolean;
  profile?: RequestProfile;
  preferredUnitId: string;
  onPreferredUnitChange: (unitId: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Gửi yêu cầu thuê"
        className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-[15px] bg-white p-8 shadow-[0_24px_30px_rgba(0,0,0,0.3)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-[22px] font-bold leading-[30px] tracking-[-0.22px] text-[#091216]">
            Gửi yêu cầu thuê
          </h2>
          <button
            type="button"
            aria-label="Đóng"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl"
            onClick={onClose}
          >
            <Image
              src="/images/listings/report-close.svg"
              alt=""
              width={22}
              height={22}
            />
          </button>
        </div>
        <RentalRequestForm
          profile={profile}
          onCancel={onClose}
          listing={listing}
          isSignedIn={isSignedIn}
          preferredUnitId={preferredUnitId}
          onPreferredUnitChange={onPreferredUnitChange}
        />
      </div>
    </div>
  );
}
