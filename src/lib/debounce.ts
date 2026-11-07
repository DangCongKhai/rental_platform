export const searchInputDebounceMs = 400;

export function debounce<Args extends unknown[]>(
  callback: (...args: Args) => void,
  waitMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Args) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      callback(...args);
    }, waitMs);
  };

  debounced.cancel = () => {
    if (timer === undefined) return;
    clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}
