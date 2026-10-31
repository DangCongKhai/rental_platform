import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
const { confirm } = vi.hoisted(() => ({ confirm: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/server/tenancies/actions", () => ({
  confirmContract: confirm,
  declineContract: vi.fn(),
  recordMoveIn: vi.fn(),
}));
vi.mock("@/server/tenancies/read", () => ({ getContractDownloadUrl: vi.fn() }));
import { ConfirmationCountdown } from "./confirmation-countdown";
import { ContractDecision } from "./contract-controls";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("disables confirmation and decline exactly at deadline, without submitting", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
  const props = {
    expiresAt: "2030-01-01T00:00:01.500Z",
    serverNow: "2030-01-01T00:00:00Z",
  };
  render(
    <>
      <ConfirmationCountdown {...props} />
      <ContractDecision {...props} id="id" sha256="hash" version={2} />
    </>,
  );
  expect(
    screen.getByRole("button", { name: "Xác nhận phiên bản 2" }),
  ).toBeEnabled();
  act(() => vi.advanceTimersByTime(1499));
  expect(
    screen.getByRole("button", { name: "Xác nhận phiên bản 2" }),
  ).toBeEnabled();
  act(() => vi.advanceTimersByTime(1));
  expect(
    screen.getByRole("button", { name: "Xác nhận phiên bản 2" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "Từ chối" })).toBeDisabled();
  expect(screen.getByRole("timer")).toHaveTextContent("Hết hạn");
  expect(confirm).not.toHaveBeenCalled();
});

it.each(["2029-12-01T00:00:00Z", "2030-02-01T00:00:00Z"])(
  "uses server time despite browser clock %s",
  (browserTime) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(browserTime));
    const props = {
      expiresAt: "2030-01-01T00:00:01.500Z",
      serverNow: "2030-01-01T00:00:00Z",
    };
    render(
      <>
        <ConfirmationCountdown {...props} />
        <ContractDecision {...props} id="id" sha256="hash" version={2} />
      </>,
    );
    act(() => vi.advanceTimersByTime(1499));
    expect(
      screen.getByRole("button", { name: "Xác nhận phiên bản 2" }),
    ).toBeEnabled();
    // Changing the device's clock does not alter elapsed monotonic time.
    vi.setSystemTime(new Date("2040-01-01T00:00:00Z"));
    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.getByRole("button", { name: "Xác nhận phiên bản 2" }),
    ).toBeDisabled();
    expect(screen.getByRole("timer")).toHaveTextContent("Hết hạn");
  },
);
