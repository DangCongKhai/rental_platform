import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const { listeners } = vi.hoisted(() => ({
  listeners: [] as Array<
    (event: string, session?: { user: { id: string } }) => void
  >,
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (callback: (typeof listeners)[number]) => {
        listeners.push(callback);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/listings",
  useSearchParams: () => new URLSearchParams("location=DaNang"),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/server/favourites", () => ({
  saveFavourite: vi.fn(async () => ({ ok: true })),
  removeFavourite: vi.fn(async () => ({ ok: true })),
}));
import type { ActionResult } from "@/server/validation";
import { saveFavourite, removeFavourite } from "@/server/favourites";
import { FavouritesProvider } from "@/contexts/favourite-context";
import { FavouriteButton } from "./favourite-button";
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  listeners.splice(0);
});
function view(userId: string | null, savedPropertyIds: string[] = []) {
  return (
    <FavouritesProvider
      key={userId ?? "guest"}
      userId={userId}
      savedPropertyIds={savedPropertyIds}
    >
      <FavouriteButton propertyId="property" />
    </FavouritesProvider>
  );
}
describe("favourite heart", () => {
  it("prompts guests and keeps the current return path", () => {
    render(view(null));
    fireEvent.click(screen.getByRole("button", { name: "Lưu tin" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
      "href",
      "/auth/login?next=%2Flistings%3Flocation%3DDaNang",
    );
    expect(saveFavourite).not.toHaveBeenCalled();
  });
  it("renders saved and removes", async () => {
    render(view("first", ["property"]));
    const button = screen.getByRole("button", { name: "Bỏ khỏi yêu thích" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    await waitFor(() =>
      expect(removeFavourite).toHaveBeenCalledWith("property"),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Đã bỏ khỏi yêu thích.",
    );
    expect(screen.getByRole("alert")).toHaveClass("bg-brand");
    expect(screen.getByRole("button", { name: "Lưu tin" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
  it("optimistically saves then rolls back a failure", async () => {
    let resolve!: (result: ActionResult) => void;
    vi.mocked(saveFavourite).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    render(view("first"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu tin" }));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    await act(async () => resolve({ ok: false, error: "Failed" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Không lưu được. Thử lại.",
    );
    expect(screen.getByRole("alert")).toHaveClass("bg-danger");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });
  it("clears the heart on logout and remounts for another account", () => {
    const { rerender } = render(view("first", ["property"]));
    act(() => listeners.forEach((listener) => listener("SIGNED_OUT")));
    expect(screen.getByRole("button", { name: "Lưu tin" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    rerender(view("second"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });
});
