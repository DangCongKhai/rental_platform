import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseForm } from "./validation";

const nameSchema = z.object({
  name: z.string().min(1),
});

describe("parseForm", () => {
  it("returns the parsed data for a valid form", () => {
    const formData = new FormData();
    formData.set("name", "Mai Nguyen");

    expect(parseForm(nameSchema, formData)).toEqual({
      ok: true,
      data: { name: "Mai Nguyen" },
    });
  });

  it("returns a Vietnamese required message when a field is missing", () => {
    const result = parseForm(nameSchema, new FormData());

    expect(result).toEqual({
      ok: false,
      error: "Dữ liệu không hợp lệ.",
      fieldErrors: { name: "Trường này là bắt buộc." },
    });
  });

  it("returns a Vietnamese required message for an empty string", () => {
    const formData = new FormData();
    formData.set("name", "");

    expect(parseForm(nameSchema, formData)).toEqual({
      ok: false,
      error: "Dữ liệu không hợp lệ.",
      fieldErrors: { name: "Trường này là bắt buộc." },
    });
  });

  it("uses the schema message when one was set", () => {
    const formData = new FormData();
    formData.set("email", "not-an-email");

    const result = parseForm(
      z.object({ email: z.email("Email không hợp lệ.") }),
      formData,
    );

    expect(result).toEqual({
      ok: false,
      error: "Dữ liệu không hợp lệ.",
      fieldErrors: { email: "Email không hợp lệ." },
    });
  });

  it("returns a Vietnamese invalid message for a bad value without a custom message", () => {
    const formData = new FormData();
    formData.set("email", "not-an-email");

    const result = parseForm(z.object({ email: z.email() }), formData);

    expect(result).toEqual({
      ok: false,
      error: "Dữ liệu không hợp lệ.",
      fieldErrors: { email: "Trường này không hợp lệ." },
    });
  });

  it.each(["user_id", "owner_id", "is_admin"] as const)(
    "rejects %s from the form and does not return data",
    (field) => {
      const formData = new FormData();
      formData.set("name", "Mai Nguyen");
      formData.set(field, "attacker");

      const result = parseForm(nameSchema, formData);

      expect(result).toEqual({
        ok: false,
        error: "Dữ liệu không hợp lệ.",
        fieldErrors: { [field]: "Trường này không được gửi từ biểu mẫu." },
      });
    },
  );
});
