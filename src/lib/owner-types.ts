import type { OccupancyBadge } from "@/domain/tenancies/occupancy";

export type OwnerProperty = {
  id: string;
  owner_id: string;
  client_operation_id: string;
  name: string;
  property_type: string;
  rental_arrangement: string;
  city: string | null;
  policies?: unknown;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OwnerListingFilter =
  | "all"
  | "action"
  | "published"
  | "draft";

export type OwnerOccupancyFilter =
  | "all"
  | "OCCUPIED"
  | "VACANT"
  | "MAINTENANCE"
  | "PENDING_CONFIRMATION"
  | "AWAITING_MOVE_IN";

export type OwnerListingStatusFilter =
  | "all"
  | "published"
  | "pending"
  | "hidden"
  | "none"
  | "draft"
  | "rejected"
  | "approved"
  | "suspended";

export type OwnerPropertyListingSummary = {
  id: string;
  title: string;
  moderation_status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  publication_status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  admin_suspended_at: string | null;
};

export type OwnerPropertySummary = OwnerProperty & {
  address_line: string | null;
  ward: string | null;
  unit_count: number;
  eligible_unit_count: number;
  listing: OwnerPropertyListingSummary | null;
  occupancy: OccupancyBadge;
};

export type OwnerUnitRental = {
  id: string;
  label: string;
  operational: "READY" | "MAINTENANCE" | "RETIRED";
  operational_label: string;
  rental: "OCCUPIED" | "AWAITING_MOVE_IN" | "PENDING_CONFIRMATION" | "VACANT";
  rental_label: string;
  tenant_name: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type OwnerPropertyRental = {
  id: string;
  name: string;
  address: string;
  property_type_label: string;
  rental_arrangement: string;
  rental_arrangement_label: string;
  counts: {
    total: number;
    occupied: number;
    vacant: number;
    maintenance: number;
  };
  units: OwnerUnitRental[];
};

export type OwnerUnitHistoryEntry = {
  id: string;
  tenant_name: string;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: string | null;
  status_label: string;
  status_tone: "success" | "warning" | "neutral" | "info";
};

export type OwnerUnitHistory = {
  property_id: string;
  property_name: string;
  unit_id: string;
  label: string;
  rental_arrangement: string;
  facts: string;
  photo_url: string | null;
  tenancies: OwnerUnitHistoryEntry[];
};

export type OwnerPropertyPage = {
  data: OwnerPropertySummary[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

export type AmenityDocument = {
  schema_version: number;
  standard: Record<string, { enabled: boolean; details?: string | null }>;
  custom: string[];
};

export type PropertyPolicies = {
  schema_version: number;
  pets: string;
  smoking: string;
  shared_rules: string[];
};

export type OwnerUnit = {
  id: string;
  property_id: string;
  label: string;
  unit_kind: string;
  description: string | null;
  floor: string | null;
  area_m2: string | number | null;
  bedrooms: number;
  bathrooms: string | number;
  bathroom_arrangement: string;
  amenities: AmenityDocument;
  advertised_monthly_rent: string | number | null;
  deposit: string | number | null;
  minimum_rental_months: number;
  max_occupants: number | null;
  operational_status: "READY" | "MAINTENANCE" | "RETIRED";
  is_marketed: boolean;
  policy_overrides: {
    pets?: string;
    smoking?: string;
    additional_rules?: string[];
  };
  archived_at: string | null;
};

export type OwnerPropertyDetail = OwnerProperty & {
  address_line: string | null;
  ward: string | null;
  description: string | null;
  content_revision: number;
  property_type: string;
  rental_arrangement: string;
  shared_amenities: AmenityDocument;
  policies: PropertyPolicies;
  units: OwnerUnit[];
};

export type OwnerPropertyMedia = {
  id: string;
  property_id: string;
  unit_id: string | null;
  caption: string | null;
  sort_order: number;
  is_selected_for_listing: boolean;
  revision: number;
  mime_type: string;
  size_bytes: number;
  preview_url: string | null;
  assigned_unit_ids?: string[];
};

export type OwnerListing = {
  id: string;
  property_id: string;
  client_operation_id: string;
  title: string;
  description: string;
  cover_media_id: string | null;
  moderation_status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  publication_status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  submitted_revision: number | null;
  submitted_content_revision: number | null;
  approved_content_revision: number | null;
  review_reason: string | null;
  admin_suspended_at: string | null;
  archived_at: string | null;
  property_content_revision: number;
};

export type AmenityCatalogEntry = {
  key: string;
  label: string;
  label_vi?: string;
  scopes: string[];
};
