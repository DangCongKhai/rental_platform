import { afterEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce";

describe("debounce", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs only the latest call after the wait", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const run = debounce(callback, 400);

    run("Hai");
    run("Hai Chau");
    vi.advanceTimersByTime(399);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("Hai Chau");
  });

  it("drops a pending call when cancelled", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const run = debounce(callback, 400);

    run("Hai");
    run.cancel();
    vi.advanceTimersByTime(400);

    expect(callback).not.toHaveBeenCalled();
  });
});
