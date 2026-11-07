export type RentalState =
  | "OCCUPIED"
  | "AWAITING_MOVE_IN"
  | "PENDING_CONFIRMATION"
  | "VACANT";

export type OperationalState = "READY" | "MAINTENANCE" | "RETIRED";

export type OccupancyStatus = RentalState | "MAINTENANCE" | "RETIRED" | "EMPTY";

export type HoldTenancy = {
  id: string;
  status: string;
  confirmedStart: string | null;
  confirmedEnd: string | null;
  blockedStart: string | null;
  blockedEnd: string | null;
  confirmationExpiresAt: string | null;
  tenantName: string | null;
};

export type OccupancyUnitInput = {
  operationalStatus: string;
  tenancies: HoldTenancy[];
};

export type ClassifiedUnit = {
  rental: RentalState;
  operational: OperationalState;
  tenantName: string | null;
  startDate: string | null;
  endDate: string | null;
  tenancyId: string | null;
  rentable: boolean;
  occupied: boolean;
  vacant: boolean;
  maintenance: boolean;
  pending: boolean;
  awaitingMoveIn: boolean;
};

export type OccupancyCounts = {
  total: number;
  occupied: number;
  vacant: number;
  maintenance: number;
  pending: number;
  awaitingMoveIn: number;
};

export type OccupancyBadge =
  | { kind: "single"; status: OccupancyStatus; label: string }
  | {
      kind: "counts";
      items: Array<{ status: OccupancyStatus; label: string }>;
    };

const rentalLabels: Record<OccupancyStatus, string> = {
  OCCUPIED: "Đang thuê",
  AWAITING_MOVE_IN: "Chờ dọn vào",
  PENDING_CONFIRMATION: "Đang chờ xác nhận",
  VACANT: "Còn trống",
  MAINTENANCE: "Bảo trì",
  RETIRED: "Ngừng hoạt động",
  EMPTY: "Chưa có căn",
};

const pendingStatuses = new Set([
  "PENDING_CONFIRMATION",
  "AWAITING_REVISION",
]);

type Span = { start: string; end: string };
type Candidate = {
  rank: number;
  tenancy: HoldTenancy;
  span: Span;
};

function spanOf(tenancy: HoldTenancy): Span | null {
  const start = tenancy.confirmedStart ?? tenancy.blockedStart;
  const end = tenancy.confirmedEnd ?? tenancy.blockedEnd;
  if (!start || !end || start > end) return null;
  return { start, end };
}

function coversToday(span: Span, today: string) {
  return span.start <= today && today <= span.end;
}

function confirmationOpen(tenancy: HoldTenancy, now: Date) {
  if (!tenancy.confirmationExpiresAt) return true;
  const expires = new Date(tenancy.confirmationExpiresAt);
  return (
    !Number.isNaN(expires.getTime()) && expires.getTime() > now.getTime()
  );
}

function candidate(
  tenancy: HoldTenancy,
  today: string,
  now: Date,
): Candidate | null {
  const span = spanOf(tenancy);
  if (!span) return null;
  const current = coversToday(span, today);
  const upcoming = span.start > today;

  if (tenancy.status === "ACTIVE" && current) {
    return { rank: 3, tenancy, span };
  }
  if (pendingStatuses.has(tenancy.status) && (current || upcoming)) {
    if (!confirmationOpen(tenancy, now)) return null;
    return { rank: 2, tenancy, span };
  }
  if (tenancy.status === "CONFIRMED" && (current || upcoming)) {
    return { rank: 1, tenancy, span };
  }
  return null;
}

function operationalOf(status: string): OperationalState {
  if (status === "MAINTENANCE" || status === "RETIRED") return status;
  return "READY";
}

function rentalOf(rank: number): RentalState {
  if (rank === 3) return "OCCUPIED";
  if (rank === 2) return "PENDING_CONFIRMATION";
  if (rank === 1) return "AWAITING_MOVE_IN";
  return "VACANT";
}

export function classifyUnit(
  unit: OccupancyUnitInput,
  today: string,
  now = new Date(),
): ClassifiedUnit {
  const chosen = unit.tenancies.reduce<Candidate | null>((best, tenancy) => {
    const next = candidate(tenancy, today, now);
    if (!next) return best;
    if (!best || next.rank > best.rank) return next;
    if (next.rank === best.rank && next.span.start > best.span.start) {
      return next;
    }
    return best;
  }, null);
  const operational = operationalOf(unit.operationalStatus);
  const rental = chosen ? rentalOf(chosen.rank) : "VACANT";
  const rentable = operational !== "RETIRED";

  return {
    rental,
    operational,
    tenantName: chosen?.tenancy.tenantName ?? null,
    startDate: chosen?.span.start ?? null,
    endDate: chosen?.span.end ?? null,
    tenancyId: chosen?.tenancy.id ?? null,
    rentable,
    occupied: rentable && rental === "OCCUPIED",
    vacant: operational === "READY" && rental === "VACANT",
    maintenance: rentable && operational === "MAINTENANCE",
    pending: rentable && rental === "PENDING_CONFIRMATION",
    awaitingMoveIn: rentable && rental === "AWAITING_MOVE_IN",
  };
}

export function classifyUnits(
  units: OccupancyUnitInput[],
  today: string,
  now = new Date(),
) {
  return units.map((unit) => classifyUnit(unit, today, now));
}

export function occupancyCounts(units: ClassifiedUnit[]): OccupancyCounts {
  return units.reduce<OccupancyCounts>(
    (counts, unit) => ({
      total: counts.total + (unit.rentable ? 1 : 0),
      occupied: counts.occupied + (unit.occupied ? 1 : 0),
      vacant: counts.vacant + (unit.vacant ? 1 : 0),
      maintenance: counts.maintenance + (unit.maintenance ? 1 : 0),
      pending: counts.pending + (unit.pending ? 1 : 0),
      awaitingMoveIn:
        counts.awaitingMoveIn + (unit.awaitingMoveIn ? 1 : 0),
    }),
    {
      total: 0,
      occupied: 0,
      vacant: 0,
      maintenance: 0,
      pending: 0,
      awaitingMoveIn: 0,
    },
  );
}

function wholeSpaceStatus(unit: ClassifiedUnit): OccupancyStatus {
  if (unit.rental === "OCCUPIED") return "OCCUPIED";
  if (unit.rental === "PENDING_CONFIRMATION") return "PENDING_CONFIRMATION";
  if (unit.rental === "AWAITING_MOVE_IN") return "AWAITING_MOVE_IN";
  if (unit.operational === "MAINTENANCE") return "MAINTENANCE";
  if (unit.operational === "RETIRED") return "RETIRED";
  return "VACANT";
}

function single(status: OccupancyStatus): OccupancyBadge {
  return { kind: "single", status, label: rentalLabels[status] };
}

export function listOccupancy(
  arrangement: string,
  units: ClassifiedUnit[],
): OccupancyBadge {
  if (arrangement === "WHOLE_SPACE") {
    const unit = units[0];
    return unit ? single(wholeSpaceStatus(unit)) : single("EMPTY");
  }

  const counts = occupancyCounts(units);
  const items: Array<{ status: OccupancyStatus; label: string }> = [];
  if (counts.occupied > 0) {
    items.push({
      status: "OCCUPIED",
      label: `${counts.occupied} đang thuê`,
    });
  }
  if (counts.vacant > 0) {
    items.push({
      status: "VACANT",
      label: `${counts.vacant} còn trống`,
    });
  }
  if (counts.maintenance > 0) {
    items.push({
      status: "MAINTENANCE",
      label: `${counts.maintenance} bảo trì`,
    });
  }
  if (counts.pending > 0) {
    items.push({
      status: "PENDING_CONFIRMATION",
      label: `${counts.pending} chờ xác nhận`,
    });
  }
  if (counts.awaitingMoveIn > 0) {
    items.push({
      status: "AWAITING_MOVE_IN",
      label: `${counts.awaitingMoveIn} chờ dọn vào`,
    });
  }
  if (items.length === 0) return single("EMPTY");
  return { kind: "counts", items };
}

export function rentalStatusLabel(state: RentalState) {
  return rentalLabels[state];
}

export function operationalStatusLabel(state: OperationalState) {
  if (state === "MAINTENANCE") return "Bảo trì";
  if (state === "RETIRED") return "Ngừng hoạt động";
  return "Bình thường";
}

export function historyStatus(status: string): {
  label: string;
  tone: "success" | "warning" | "neutral" | "info";
} {
  if (status === "ACTIVE") return { label: "Đang thuê", tone: "success" };
  if (status === "CONFIRMED") {
    return { label: "Chờ dọn vào", tone: "info" };
  }
  if (pendingStatuses.has(status)) {
    return { label: "Chờ xác nhận", tone: "warning" };
  }
  return { label: "Đã kết thúc", tone: "neutral" };
}
