import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button type="button">Lưu</Button>);
    expect(screen.getByRole("button", { name: "Lưu" })).toBeTruthy();
  });
});
