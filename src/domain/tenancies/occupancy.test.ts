import { describe, expect, it } from "vitest";
import {
  classifyUnit,
  historyStatus,
  listOccupancy,
  occupancyCounts,
  type HoldTenancy,
} from "./occupancy";

const today = "2026-06-15";
const now = new Date("2026-06-15T03:00:00.000Z");

function hold(overrides: Partial<HoldTenancy> = {}): HoldTenancy {
  return {
    id: "tenancy-1",
    status: "ACTIVE",
    confirmedStart: "2026-03-01",
    confirmedEnd: "2027-02-28",
    blockedStart: "2026-03-01",
    blockedEnd: "2027-02-28",
    confirmationExpiresAt: null,
    tenantName: "Nguyễn Minh Anh",
    ...overrides,
  };
}

describe("unit rental occupancy", () => {
  it("marks an active tenancy covering today as occupied", () => {
    const unit = classifyUnit(
      { operationalStatus: "READY", tenancies: [hold()] },
      today,
      now,
    );
    expect(unit.rental).toBe("OCCUPIED");
    expect(unit.tenantName).toBe("Nguyễn Minh Anh");
    expect(unit.startDate).toBe("2026-03-01");
    expect(unit.occupied).toBe(true);
    expect(unit.vacant).toBe(false);
  });

  it("ignores an active tenancy whose dates have passed", () => {
    const unit = classifyUnit(
      {
        operationalStatus: "READY",
        tenancies: [
          hold({
            confirmedStart: "2024-01-01",
            confirmedEnd: "2024-12-31",
            blockedStart: "2024-01-01",
            blockedEnd: "2024-12-31",
          }),
        ],
      },
      today,
      now,
    );
    expect(unit.rental).toBe("VACANT");
    expect(unit.tenantName).toBeNull();
  });

  it("reserves a unit with a live pending confirmation", () => {
    const unit = classifyUnit(
      {
        operationalStatus: "READY",
        tenancies: [
          hold({
            status: "PENDING_CONFIRMATION",
            confirmedStart: null,
            confirmedEnd: null,
            blockedStart: "2026-07-01",
            blockedEnd: "2027-06-30",
            confirmationExpiresAt: "2026-06-20T00:00:00.000Z",
          }),
        ],
      },
      today,
      now,
    );
    expect(unit.rental).toBe("PENDING_CONFIRMATION");
    expect(unit.pending).toBe(true);
    expect(unit.occupied).toBe(false);
    expect(unit.vacant).toBe(false);
  });

  it("does not reserve a unit after confirmation has expired", () => {
    const unit = classifyUnit(
      {
        operationalStatus: "READY",
        tenancies: [
          hold({
            status: "AWAITING_REVISION",
            confirmationExpiresAt: "2026-06-01T00:00:00.000Z",
          }),
        ],
      },
      today,
      now,
    );
    expect(unit.rental).toBe("VACANT");
  });

  it("keeps a confirmed tenancy as waiting for move-in", () => {
    const unit = classifyUnit(
      {
        operationalStatus: "READY",
        tenancies: [
          hold({
            status: "CONFIRMED",
            confirmedStart: "2026-07-01",
            confirmedEnd: "2027-06-30",
          }),
        ],
      },
      today,
      now,
    );
    expect(unit.rental).toBe("AWAITING_MOVE_IN");
    expect(unit.awaitingMoveIn).toBe(true);
    expect(unit.occupied).toBe(false);
  });

  it("prefers the active tenancy over a pending hold", () => {
    const unit = classifyUnit(
      {
        operationalStatus: "READY",
        tenancies: [
          hold({
            id: "pending",
            status: "PENDING_CONFIRMATION",
            tenantName: "Khác",
          }),
          hold({ id: "active", tenantName: "Đang ở" }),
        ],
      },
      today,
      now,
    );
    expect(unit.tenancyId).toBe("active");
    expect(unit.rental).toBe("OCCUPIED");
  });

  it("keeps maintenance out of the vacant count", () => {
    const vacant = classifyUnit(
      { operationalStatus: "MAINTENANCE", tenancies: [] },
      today,
      now,
    );
    expect(vacant.vacant).toBe(false);
    expect(vacant.maintenance).toBe(true);
    expect(vacant.rentable).toBe(true);

    const occupied = classifyUnit(
      { operationalStatus: "MAINTENANCE", tenancies: [hold()] },
      today,
      now,
    );
    expect(occupied.occupied).toBe(true);
    expect(occupied.maintenance).toBe(true);
  });

  it("leaves retired units out of the rentable totals", () => {
    const units = [
      classifyUnit(
        { operationalStatus: "RETIRED", tenancies: [hold()] },
        today,
        now,
      ),
      classifyUnit(
        { operationalStatus: "READY", tenancies: [] },
        today,
        now,
      ),
    ];
    expect(units[0]?.rental).toBe("OCCUPIED");
    expect(units[0]?.rentable).toBe(false);
    expect(occupancyCounts(units)).toMatchObject({
      total: 1,
      occupied: 0,
      vacant: 1,
    });
  });
});

describe("property occupancy badges", () => {
  it("uses one badge for a whole-space property", () => {
    const occupied = classifyUnit(
      { operationalStatus: "MAINTENANCE", tenancies: [hold()] },
      today,
      now,
    );
    expect(listOccupancy("WHOLE_SPACE", [occupied])).toEqual({
      kind: "single",
      status: "OCCUPIED",
      label: "Đang thuê",
    });

    const empty = classifyUnit(
      { operationalStatus: "MAINTENANCE", tenancies: [] },
      today,
      now,
    );
    expect(listOccupancy("WHOLE_SPACE", [empty]).kind === "single" &&
      listOccupancy("WHOLE_SPACE", [empty]),
    ).toMatchObject({ status: "MAINTENANCE", label: "Bảo trì" });
  });

  it("counts separate units and hides zero groups", () => {
    const units = [
      classifyUnit(
        { operationalStatus: "READY", tenancies: [hold()] },
        today,
        now,
      ),
      classifyUnit(
        { operationalStatus: "READY", tenancies: [hold()] },
        today,
        now,
      ),
      classifyUnit(
        { operationalStatus: "READY", tenancies: [] },
        today,
        now,
      ),
      classifyUnit(
        { operationalStatus: "MAINTENANCE", tenancies: [] },
        today,
        now,
      ),
    ];
    expect(listOccupancy("SEPARATE_UNITS", units)).toEqual({
      kind: "counts",
      items: [
        { status: "OCCUPIED", label: "2 đang thuê" },
        { status: "VACANT", label: "1 còn trống" },
        { status: "MAINTENANCE", label: "1 bảo trì" },
      ],
    });
  });

  it("shows a pending count only when a unit is reserved", () => {
    const pending = classifyUnit(
      {
        operationalStatus: "READY",
        tenancies: [
          hold({
            status: "PENDING_CONFIRMATION",
            confirmedStart: null,
            confirmedEnd: null,
            blockedStart: "2026-08-01",
            blockedEnd: "2027-07-31",
          }),
        ],
      },
      today,
      now,
    );
    const badge = listOccupancy("SEPARATE_UNITS", [pending]);
    expect(badge).toEqual({
      kind: "counts",
      items: [
        { status: "PENDING_CONFIRMATION", label: "1 chờ xác nhận" },
      ],
    });
  });
});

describe("tenancy history status", () => {
  it("maps stored statuses to the history labels", () => {
    expect(historyStatus("ACTIVE").label).toBe("Đang thuê");
    expect(historyStatus("CONFIRMED").label).toBe("Chờ dọn vào");
    expect(historyStatus("PENDING_CONFIRMATION").label).toBe(
      "Chờ xác nhận",
    );
    expect(historyStatus("ENDED").label).toBe("Đã kết thúc");
    expect(historyStatus("CANCELLED").label).toBe("Đã kết thúc");
  });
});
