import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { NotificationBell } from "./notification-bell";
import type { InboxNotification } from "./notification-list";

const { authListeners } = vi.hoisted(() => ({
  authListeners: [] as Array<(event: string) => void>,
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (callback: (event: string) => void) => {
        authListeners.push(callback);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/server/notifications/inbox", () => ({
  markNotificationRead: vi.fn(async () => ({ ok: true })),
  markAllNotificationsRead: vi.fn(async () => ({ ok: true })),
}));
afterEach(() => {
  cleanup();
  authListeners.splice(0);
});
const row = (audience: string, id: string): InboxNotification => ({
  id,
  audience,
  title: `Message ${id}`,
  body: "Body",
  readAt: null,
  createdAt: "2026-10-30T10:00:00.000Z",
  resourceType: "tenancy",
  resourceId: id,
});
describe("notification bell", () => {
  it("shows count and labels from audience", () => {
    render(
      <NotificationBell
        notifications={[row("TENANT", "one"), row("OWNER", "two")]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Thông báo, 2 chưa đọc" }),
    );
    expect(screen.getByText("Người thuê")).toBeInTheDocument();
    expect(screen.getByText("Chủ nhà")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Xem tất cả thông báo" }),
    ).toHaveAttribute("href", "/account/notifications");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.queryByRole("region", { name: "Thông báo" }),
    ).not.toBeInTheDocument();
  });
  it("clears private UI immediately on sign out", () => {
    render(<NotificationBell notifications={[row("TENANT", "private")]} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Thông báo, 1 chưa đọc" }),
    );
    act(() => authListeners.forEach((listener) => listener("SIGNED_OUT")));
    expect(screen.queryByText("Message private")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Thông báo/ }),
    ).not.toBeInTheDocument();
  });
  it("shows empty dropdown", () => {
    render(<NotificationBell notifications={[]} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Thông báo, 0 chưa đọc" }),
    );
    expect(screen.getByText("Chưa có thông báo.")).toBeInTheDocument();
  });
  it("uses refreshed props after mark-read and resets for another session", () => {
    const { rerender } = render(
      <NotificationBell
        key="first"
        notifications={[row("TENANT", "private")]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Thông báo, 1 chưa đọc" }),
    );
    rerender(
      <NotificationBell
        key="first"
        notifications={[
          { ...row("TENANT", "private"), readAt: "2026-10-30T11:00:00.000Z" },
        ]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Thông báo, 0 chưa đọc" }),
    ).toBeInTheDocument();
    rerender(<NotificationBell key="second" notifications={[]} />);
    expect(screen.queryByText("Message private")).not.toBeInTheDocument();
  });
});
