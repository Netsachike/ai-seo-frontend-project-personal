const ONE_YEAR = 60 * 60 * 24 * 365;

/** Client-side cookie write for UI preferences the server needs on the next render. */
export function setClientCookie(name: string, value: string, maxAge = ONE_YEAR) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function readClientCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}
