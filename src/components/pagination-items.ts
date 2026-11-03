export function paginationItems(
  current: number,
  lastPage: number,
): Array<number | "gap"> {
  const page = Math.min(Math.max(current, 1), lastPage);
  const wanted =
    lastPage <= 5
      ? Array.from({ length: lastPage }, (_, index) => index + 1)
      : page <= 4
        ? [1, 2, 3, 4, 5, lastPage]
        : page >= lastPage - 3
          ? [
              1,
              lastPage - 4,
              lastPage - 3,
              lastPage - 2,
              lastPage - 1,
              lastPage,
            ]
          : [1, page - 1, page, page + 1, lastPage];
  const numbers = [
    ...new Set(wanted.filter((item) => item >= 1 && item <= lastPage)),
  ].sort((left, right) => left - right);
  const items: Array<number | "gap"> = [];
  numbers.forEach((item, index) => {
    if (index > 0 && item - numbers[index - 1] > 1) items.push("gap");
    items.push(item);
  });
  return items;
}
