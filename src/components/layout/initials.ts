/** Up to two initials, grapheme-safe so non-Latin names don't split mid-character. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = (word: string | undefined) => (word ? Array.from(word)[0] : "");
  const value =
    words.length > 1
      ? first(words[0]) + first(words[words.length - 1])
      : Array.from(words[0] ?? "")
          .slice(0, 2)
          .join("");
  return value.toLocaleUpperCase();
}
