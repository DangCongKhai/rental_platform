function isRedirect(caught: unknown) {
  return (
    typeof caught === "object" &&
    caught !== null &&
    "digest" in caught &&
    String((caught as { digest?: unknown }).digest).startsWith(
      "NEXT_REDIRECT",
    )
  );
}

export function rethrowRedirect(caught: unknown) {
  if (isRedirect(caught)) throw caught;
}

export function actionMessage(caught: unknown, fallback: string) {
  rethrowRedirect(caught);
  if (caught instanceof Error && caught.message) return caught.message;
  return fallback;
}
