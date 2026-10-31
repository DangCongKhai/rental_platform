// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ReportHistory } from "./report-history";
afterEach(cleanup);
it("shows an empty history", () => {
  render(<ReportHistory reports={[]} />);
  expect(screen.getByText("Bạn chưa gửi báo cáo nào.")).toBeTruthy();
});
it("selects report outcomes without loading listing details or internal notes", () => {
  const base = {
    listingId: "listing",
    createdAt: new Date("2026-10-19T00:00:00Z"),
    reasonCodes: ["MISLEADING", "FRAUD"],
  };
  render(
    <ReportHistory
      reports={[
        { ...base, id: "first", status: "REVIEWING", resolutionSummary: null },
        {
          ...base,
          id: "second",
          status: "RESOLVED",
          resolutionSummary: "Tin đã được sửa.",
        },
      ]}
    />,
  );
  expect(screen.getAllByText("19/10/2026", { selector: "td" })[0]).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "#second" }));
  expect(screen.getByText("Tin đã được sửa.")).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "#second" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
});
