export const THEME_COOKIE = "orbit_theme";
export const themePreferences = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof themePreferences)[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (themePreferences as readonly string[]).includes(value);
}

/** Everyone starts in light mode; dark and system stay available as choices. */
export const DEFAULT_THEME: ThemePreference = "light";
