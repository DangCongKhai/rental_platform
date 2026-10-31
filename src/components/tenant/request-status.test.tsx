import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RequestStatus, RequestTabs } from "./request-status";
afterEach(cleanup);
describe("tenant request tracking", () => {
  it("links open and closed tabs and marks the selected tab", () => {
    render(<RequestTabs tab="closed" />);
    expect(
      screen.getByRole("link", { name: "Đang mở" }).getAttribute("href"),
    ).toBe("/tenant/requests?tab=open");
    expect(
      screen
        .getByRole("link", { name: "Đã đóng" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });
  it("shows accepted confirmation and revision states", () => {
    const { rerender } = render(
      <RequestStatus status="ACCEPTED" tenancyStatus="PENDING_CONFIRMATION" />,
    );
    expect(screen.getByText("Đang chờ bạn xác nhận hợp đồng")).toBeTruthy();
    rerender(
      <RequestStatus status="ACCEPTED" tenancyStatus="AWAITING_REVISION" />,
    );
    expect(screen.getByText("Đang chờ phiên bản sửa đổi")).toBeTruthy();
  });
});
