import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const { push, create } = vi.hoisted(() => ({ push: vi.fn(), create: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/server/requests/create-rental-request", () => ({
  createRentalRequest: create,
}));
import { RentalRequestForm } from "./rental-request-form";
const listing = {
  id: "listing-id",
  title: "Studio",
  property: { name: "Nhà" },
  units: [],
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function form(signedIn = true) {
  return render(
    <RentalRequestForm
      listing={listing}
      isSignedIn={signedIn}
      profile={{ fullName: "Mai", phone: "invalid" }}
      preferredUnitId=""
      onPreferredUnitChange={vi.fn()}
    />,
  );
}
function pickDate(label: string, value: string) {
  fireEvent.click(screen.getByLabelText(label));
  const [day, month, year] = value.split("/").map(Number);
  for (let step = 0; step < 240; step += 1) {
    const caption = screen.getByRole("status").textContent ?? "";
    const match = /Tháng (\d+) (\d+)/.exec(caption);
    if (!match) throw new Error(caption);
    const current = Number(match[2]) * 12 + Number(match[1]);
    const target = year * 12 + month;
    if (current === target) break;
    fireEvent.click(
      screen.getByRole("button", {
        name: current < target ? "Tháng sau" : "Tháng trước",
      }),
    );
  }
  fireEvent.click(
    screen.getByRole("button", { name: `${day} tháng ${month} năm ${year}` }),
  );
}
function dates() {
  pickDate("Ngày dọn vào mong muốn", "01/11/2026");
  pickDate("Ngày kết thúc mong muốn", "01/12/2026");
}
it("shows invalid phone and minimum date range errors", () => {
  form();
  dates();
  fireEvent.change(screen.getByLabelText("Lời nhắn cho chủ nhà"), {
    target: { value: "Xin thuê" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu" }));
  expect(screen.getAllByRole("alert").map((row) => row.textContent)).toEqual(
    expect.arrayContaining([
      "Số điện thoại không hợp lệ.",
      "Thời hạn thuê tối thiểu là 3 tháng.",
    ]),
  );
  expect(create).not.toHaveBeenCalled();
});
it("returns a guest to the listing after login", () => {
  form(false);
  fireEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu" }));
  expect(push).toHaveBeenCalledWith("/auth/login?next=/listings/listing-id");
});
it("prefills the profile and links successful requests", async () => {
  form();
  dates();
  fireEvent.change(screen.getByLabelText(/Số điện thoại/), {
    target: { value: "0901234567" },
  });
  pickDate("Ngày kết thúc mong muốn", "01/02/2027");
  fireEvent.change(screen.getByLabelText("Lời nhắn cho chủ nhà"), {
    target: { value: "Xin thuê" },
  });
  create.mockResolvedValue({ ok: true, data: { requestId: "request-id" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu" }));
  await waitFor(() =>
    expect(
      screen
        .getByRole("link", { name: "Xem yêu cầu thuê" })
        .getAttribute("href"),
    ).toBe("/tenant/requests/request-id"),
  );
  expect(create).toHaveBeenCalledWith(
    "listing-id",
    expect.objectContaining({
      contactName: "Mai",
      desiredEndDate: "2027-02-01",
    }),
  );
});
