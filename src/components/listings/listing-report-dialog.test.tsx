// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/server/reports/report-listing", () => ({ reportListing: vi.fn() }));
import { reportListing } from "@/server/reports/report-listing";
import { ListingReportDialog } from "./listing-report-dialog";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("requires reasons and description and submits multiple checkbox selections", async () => {
  vi.mocked(reportListing).mockResolvedValue({
    ok: true,
    data: { reportId: "id" },
  });
  render(
    <ListingReportDialog
      listingId="id"
      listingTitle="Studio"
      isSignedIn
      onClose={() => {}}
    />,
  );
  fireEvent.click(screen.getByText("Gửi báo cáo"));
  expect(screen.getByRole("alert").textContent).toContain("Chọn lý do");
  fireEvent.click(screen.getByRole("checkbox", { name: /Gian lận/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Sai lệch/ }));
  fireEvent.click(screen.getByText("Gửi báo cáo"));
  expect(screen.getByRole("alert").textContent).toContain("Nhập mô tả");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Ảnh sai" },
  });
  fireEvent.click(screen.getByText("Gửi báo cáo"));
  await waitFor(() =>
    expect(reportListing).toHaveBeenCalledWith("id", {
      reasonCodes: ["FRAUD", "MISLEADING"],
      description: "Ảnh sai",
    }),
  );
  expect((await screen.findByRole("status")).textContent).toContain(
    "Đã gửi báo cáo",
  );
});
it("shows server duplicate errors and a guest login path", async () => {
  const view = render(
    <ListingReportDialog
      listingId="id"
      listingTitle="Studio"
      isSignedIn={false}
      onClose={() => {}}
    />,
  );
  expect(
    screen.getByRole("link", { name: "Đăng nhập" }).getAttribute("href"),
  ).toBe("/auth/login?next=%2Flistings%2Fid");
  view.rerender(
    <ListingReportDialog
      listingId="id"
      listingTitle="Studio"
      isSignedIn
      onClose={() => {}}
    />,
  );
  vi.mocked(reportListing).mockResolvedValue({
    ok: false,
    error: "Bạn đã báo cáo tin này.",
  });
  fireEvent.click(screen.getByRole("checkbox", { name: /Khác/ }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Mô tả" } });
  fireEvent.click(screen.getByText("Gửi báo cáo"));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Bạn đã báo cáo tin này.",
  );
});
