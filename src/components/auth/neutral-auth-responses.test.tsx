import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SignUpForm } from "./sign-up-form";
import { ForgotPasswordForm } from "./forgot-password-form";

const { signUp, resetPasswordForEmail } = vi.hoisted(() => ({
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signUp, resetPasswordForEmail, resend: vi.fn() },
  }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function submitSignUp() {
  fireEvent.change(screen.getByLabelText("Họ và tên"), {
    target: { value: "Mai Nguyen" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "mai@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "StrongPassword123!" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Tạo tài khoản" }).closest("form")!,
  );
}
function submitReset() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "mai@example.test" },
  });
  fireEvent.submit(
    screen
      .getByRole("button", { name: "Gửi liên kết đặt lại" })
      .closest("form")!,
  );
}

describe("neutral account existence responses", () => {
  it("renders identical check-email states for signup success and both duplicate codes, retaining safe next", async () => {
    const destination = "/listings/apartment-id?view=details";
    let successfulMarkup = "";
    for (const code of [null, "user_already_exists", "email_exists"]) {
      signUp.mockResolvedValueOnce({
        error: code ? { code, message: "Account already exists" } : null,
      });
      const { container, unmount } = render(<SignUpForm next={destination} />);
      submitSignUp();
      await screen.findByRole("heading", { name: "Kiểm tra email của bạn" });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
        "href",
        `/auth/login?next=${encodeURIComponent(destination)}`,
      );
      expect(signUp).toHaveBeenLastCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            emailRedirectTo: `${window.location.origin}${destination}`,
          }),
        }),
      );
      if (!code) successfulMarkup = container.innerHTML;
      else expect(container.innerHTML).toBe(successfulMarkup);
      unmount();
    }
  });

  it("keeps non-duplicate signup errors visible", async () => {
    signUp.mockResolvedValueOnce({ error: { code: "weak_password" } });
    render(<SignUpForm next="/listings/id" />);
    submitSignUp();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mật khẩu quá yếu",
    );
    expect(
      screen.queryByRole("heading", { name: "Kiểm tra email của bạn" }),
    ).not.toBeInTheDocument();
  });

  it("renders identical neutral reset responses for success and missing email", async () => {
    let successfulMarkup = "";
    for (const code of [null, "user_not_found"]) {
      resetPasswordForEmail.mockResolvedValueOnce({
        error: code ? { code, message: "User not found" } : null,
      });
      const { container, unmount } = render(<ForgotPasswordForm />);
      submitReset();
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Nếu email này tồn tại trong hệ thống",
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(resetPasswordForEmail).toHaveBeenLastCalledWith(
        "mai@example.test",
        { redirectTo: `${window.location.origin}/auth/update-password` },
      );
      if (!code) successfulMarkup = container.innerHTML;
      else expect(container.innerHTML).toBe(successfulMarkup);
      unmount();
    }
  });

  it.each(["over_email_send_rate_limit", "over_request_rate_limit"])(
    "keeps reset rate-limit error %s visible",
    async (code) => {
      resetPasswordForEmail.mockResolvedValueOnce({ error: { code } });
      render(<ForgotPasswordForm />);
      submitReset();
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Bạn thao tác quá nhanh",
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    },
  );

  it("keeps reset transport errors visible", async () => {
    resetPasswordForEmail.mockRejectedValueOnce(
      new Error("Network unavailable"),
    );
    render(<ForgotPasswordForm />);
    submitReset();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network unavailable",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
