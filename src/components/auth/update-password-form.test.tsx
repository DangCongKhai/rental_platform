import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { UpdatePasswordForm } from "./update-password-form";

const { exchangeCodeForSession, updateUser, getSession } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  updateUser: vi.fn(),
  getSession: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { exchangeCodeForSession, updateUser, getSession },
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/auth/update-password");
});

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
    target: { value: "NewPassword123!" },
  });
  fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu"), {
    target: { value: "NewPassword123!" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Lưu mật khẩu mới" }).closest("form")!,
  );
}

it("does not create a session until the new password is submitted", async () => {
  window.history.replaceState(
    {},
    "",
    "/auth/update-password?code=recovery-code",
  );
  exchangeCodeForSession.mockResolvedValue({ error: null });
  updateUser.mockReturnValue(new Promise(() => {}));
  render(<UpdatePasswordForm />);

  expect(exchangeCodeForSession).not.toHaveBeenCalled();
  fillAndSubmit();

  await waitFor(() => {
    expect(exchangeCodeForSession).toHaveBeenCalledWith("recovery-code");
    expect(updateUser).toHaveBeenCalledWith({ password: "NewPassword123!" });
  });
  expect(getSession).not.toHaveBeenCalled();
});

it("refuses a reset that has neither a recovery code nor a session", async () => {
  getSession.mockResolvedValue({ data: { session: null } });
  render(<UpdatePasswordForm />);
  fillAndSubmit();

  expect(
    await screen.findByText(/Liên kết đặt lại mật khẩu không còn hiệu lực/),
  ).toBeInTheDocument();
  expect(exchangeCodeForSession).not.toHaveBeenCalled();
  expect(updateUser).not.toHaveBeenCalled();
});
