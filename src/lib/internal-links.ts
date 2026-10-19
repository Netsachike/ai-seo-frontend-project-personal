/** Hostname without a leading `www.`, lowercased, so `www.site.com` and `site.com` match. */
export const bareHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

/** A link to another page on the site: relative, or absolute to the site's own host. */
export function isInternalHref(href: string, domain: string): boolean {
  const value = href.trim();
  if (!value || /^(#|mailto:|tel:|javascript:)/i.test(value)) return false;
  if (!/^https?:\/\//i.test(value) && !value.startsWith("//")) return true;
  try {
    return bareHost(new URL(value, "https://x").hostname) === bareHost(domain);
  } catch {
    return false;
  }
}

/**
 * The page an on-site link points to (path and query, no trailing slash), so
 * `/pricing/`, `https://site.com/pricing` and `pricing` compare equal.
 */
export function internalLinkKey(href: string, domain: string): string {
  try {
    const url = new URL(href.trim(), `https://${domain || "x"}/`);
    return (url.pathname.replace(/\/+$/, "") || "/") + url.search;
  } catch {
    return href.trim();
  }
}
