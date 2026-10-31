export type ListingCompletenessUnit = {
  id: string;
  label: string;
  isMarketed: boolean;
  description: string | null;
  areaM2: number | null;
  advertisedMonthlyRent: number | null;
  deposit: number | null;
  minimumRentalMonths: number;
  maxOccupants: number | null;
  hasSelectedPhoto: boolean;
};

export type ListingCompletenessInput = {
  title: string;
  description: string;
  addressLine: string | null;
  city: string | null;
  propertyDescription: string | null;
  hasSelectedSharedPhoto: boolean;
  hasSelectedCover: boolean;
  policiesValid: boolean;
  units: ListingCompletenessUnit[];
};

export type ListingCompletenessIssue = {
  field: string;
  message: string;
  unitLabel?: string;
};

export function checkListingCompleteness(input: ListingCompletenessInput): ListingCompletenessIssue[] {
  const issues: ListingCompletenessIssue[] = [];

  if (!input.title.trim()) issues.push({ field: "title", message: "Nhập tiêu đề tin đăng." });
  if (!input.description.trim()) issues.push({ field: "description", message: "Nhập mô tả tin đăng." });
  if (!input.addressLine?.trim() || !input.city?.trim()) {
    issues.push({ field: "address", message: "Bổ sung địa chỉ và thành phố cho bất động sản." });
  }
  if (!input.propertyDescription?.trim()) {
    issues.push({ field: "property.description", message: "Bổ sung mô tả cho bất động sản." });
  }
  if (!input.hasSelectedSharedPhoto) {
    issues.push({ field: "sharedPhotos", message: "Chọn ít nhất một ảnh dùng chung của bất động sản." });
  }
  if (!input.hasSelectedCover) {
    issues.push({ field: "cover", message: "Chọn ảnh bìa từ ảnh dùng chung đã chọn." });
  }
  if (!input.policiesValid) {
    issues.push({ field: "policies", message: "Kiểm tra lại quy định và nội quy của bất động sản." });
  }

  const marketedUnits = input.units.filter((unit) => unit.isMarketed);
  if (marketedUnits.length === 0) {
    issues.push({ field: "units", message: "Chọn ít nhất một căn/phòng để quảng bá." });
  }

  for (const unit of marketedUnits) {
    if (!unit.description?.trim()) {
      issues.push({ field: "unit.description", message: `${unit.label}: bổ sung mô tả căn/phòng.`, unitLabel: unit.label });
    }
    if (unit.areaM2 === null || unit.areaM2 <= 0) {
      issues.push({ field: "unit.areaM2", message: `${unit.label}: bổ sung diện tích hợp lệ.`, unitLabel: unit.label });
    }
    if (unit.advertisedMonthlyRent === null || unit.advertisedMonthlyRent <= 0) {
      issues.push({ field: "unit.rent", message: `${unit.label}: bổ sung giá thuê hợp lệ.`, unitLabel: unit.label });
    }
    if (unit.deposit === null || unit.deposit < 0) {
      issues.push({ field: "unit.deposit", message: `${unit.label}: bổ sung tiền cọc hợp lệ.`, unitLabel: unit.label });
    }
    if (unit.minimumRentalMonths < 3) {
      issues.push({ field: "unit.minimumRentalMonths", message: `${unit.label}: thời hạn thuê tối thiểu là 3 tháng.`, unitLabel: unit.label });
    }
    if (unit.maxOccupants === null || unit.maxOccupants < 1) {
      issues.push({ field: "unit.maxOccupants", message: `${unit.label}: bổ sung số người ở tối đa.`, unitLabel: unit.label });
    }
    if (!unit.hasSelectedPhoto) {
      issues.push({ field: "unit.photos", message: `${unit.label}: chọn ít nhất một ảnh cho căn/phòng này.`, unitLabel: unit.label });
    }
  }

  return issues;
}
