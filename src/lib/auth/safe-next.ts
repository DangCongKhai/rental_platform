/** Accept only local destinations outside the authentication flow. */
export function safeNext(value: string | null | undefined): string | null {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  )
    return null;
  let url: URL;
  try {
    url = new URL(value, "https://local.invalid");
    const path = decodeURIComponent(url.pathname);
    if (
      path.startsWith("/auth") ||
      path.startsWith("//") ||
      /[\\\u0000-\u0020\u007f]/.test(path)
    )
      return null;
  } catch {
    return null;
  }
  if (url.origin !== "https://local.invalid") return null;
  const destination = `${url.pathname}${url.search}${url.hash}`;
  // Home is the default after login. A `?next=/` link is the same destination.
  return destination === "/" ? null : destination;
}
