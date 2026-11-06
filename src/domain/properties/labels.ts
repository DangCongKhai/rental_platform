export function propertyTypeLabel(value: string) {
  if (value === "HOUSE") return "Nhà";
  if (value === "APARTMENT") return "Căn hộ";
  if (value === "APARTMENT_BUILDING") return "Tòa nhà căn hộ";
  return "Khác";
}

export function rentalArrangementLabel(value: string) {
  if (value === "WHOLE_SPACE") return "Toàn bộ không gian";
  return "Từng căn riêng lẻ";
}
