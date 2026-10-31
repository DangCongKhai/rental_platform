import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DateField } from "./date-field";
afterEach(cleanup);
it("converts strict dd/mm/yyyy into an ISO form value", () => {
  const { container } = render(
    <form>
      <DateField name="date" label="Ngày" />
    </form>,
  );
  const field = screen.getByRole("textbox");
  fireEvent.change(field, { target: { value: "31/12/2026" } });
  expect(new FormData(container.querySelector("form")!).get("date")).toBe(
    "2026-12-31",
  );
  for (const value of [
    "12/31/2026",
    "2026-12-31",
    "31/02/2026",
    "29/02/2025",
  ]) {
    fireEvent.change(field, { target: { value } });
    expect(new FormData(container.querySelector("form")!).get("date")).toBe("");
    expect(screen.getByRole("alert").textContent).toContain("dd/mm/yyyy");
  }
});
