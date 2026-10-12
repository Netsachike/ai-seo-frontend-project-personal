"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import {
  BRAND_CONFIG_STORAGE_PREFIX,
  DEFAULT_BRAND_CONFIG,
  TENANT_TOKEN_NAMES,
  deriveTenantTokens,
  isDefaultAppHost,
  isVendorBranding,
  mergeBrandConfig,
  normalizeHost,
  type BrandConfig,
} from "@/config/brand";
import { THEME_COOKIE } from "@/lib/theme";
import CustomDomainService from "@/services/custom-domain";

type BrandContextValue = {
  brandConfig: BrandConfig;
  currentHost: string;
  /** The request host is not Rankoya's own host, i.e. a reseller domain. */
  isCustomDomain: boolean;
  /** Brand resolution has settled. Always true immediately on the vendor host. */
  isBrandReady: boolean;
};

const BrandContext = React.createContext<BrandContextValue | undefined>(undefined);

const storageKey = (host: string) => `${BRAND_CONFIG_STORAGE_PREFIX}:${host}`;

/** Last known brand for this exact host; corrupt or absent entries degrade to the defaults. */
function readStoredBrandConfig(host: string): BrandConfig {
  try {
    const raw = window.localStorage.getItem(storageKey(host));
    if (!raw) return DEFAULT_BRAND_CONFIG;
    return { ...DEFAULT_BRAND_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BRAND_CONFIG;
  }
}

function writeStoredBrandConfig(host: string, config: BrandConfig) {
  try {
    window.localStorage.setItem(storageKey(host), JSON.stringify(config));
  } catch {
    // Private mode or quota: the brand still applies for this page view.
  }
}

/**
 * Paints the tenant palette onto `:root`. Rankoya's components read tokens
 * (`--ink`, `--blue`, `--nav-bg`…), so overriding them inline restyles every
 * button, link, sidebar and focus ring at once; removing them restores the
 * stylesheet defaults.
 */
function applyBrandColors(config: BrandConfig) {
  const root = document.documentElement;
  clearBrandColors();
  for (const [token, value] of Object.entries(deriveTenantTokens(config))) {
    root.style.setProperty(token, value);
  }
}

/** Clears every inline override so the stylesheet's Rankoya palette wins. */
function clearBrandColors() {
  const root = document.documentElement;
  for (const token of TENANT_TOKEN_NAMES) root.style.removeProperty(token);
}

/**
 * Applies the reseller's preferred appearance, but only for a viewer who has
 * not chosen one: the default is a starting point, not a lock.
 */
function applyDefaultTheme(preference: BrandConfig["default_theme"], setTheme: (theme: string) => void) {
  if (preference !== "dark" && preference !== "light") return;
  try {
    if (window.localStorage.getItem(THEME_COOKIE)) return;
  } catch {
    // Storage blocked: treat it as no stored choice.
  }
  setTheme(preference);
}

/** Browsers cache favicons hard, so a cache-buster makes a new icon show. */
function applyFavicon(faviconUrl: string | null) {
  const rawIconUrl = (faviconUrl || "/favicon.ico").trim();
  const iconUrl = `${rawIconUrl}${rawIconUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
  const existing = Array.from(document.querySelectorAll('link[rel*="icon"]')) as HTMLLinkElement[];
  if (existing.length > 0) {
    existing.forEach((link) => {
      link.href = iconUrl;
    });
    return;
  }
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = iconUrl;
  document.head.appendChild(link);
}

type BrandState = { config: BrandConfig; host: string; ready: boolean };

/**
 * Resolves the White Label brand for the host the app is served from. On
 * Rankoya's own host (and localhost / previews) it keeps the stock identity
 * and is ready immediately; on a tenant host it paints the last known brand
 * from storage, then the backend's answer.
 */
export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<BrandState>({ config: DEFAULT_BRAND_CONFIG, host: "", ready: false });

  // Held in a ref so applying the tenant's default appearance doesn't make
  // the bootstrap effect depend on next-themes' identity.
  const { setTheme } = useTheme();
  const setThemeRef = React.useRef(setTheme);
  React.useEffect(() => {
    setThemeRef.current = setTheme;
  }, [setTheme]);

  React.useEffect(() => {
    let cancelled = false;
    const host = normalizeHost(window.location.host);
    const onDefaultHost = isDefaultAppHost(host);

    // The vendor host never inherits a cached tenant brand. Tenant hosts
    // paint their last known brand straight away, so customers don't see a
    // flash of Rankoya while /resolve is in flight.
    const stored = onDefaultHost ? DEFAULT_BRAND_CONFIG : readStoredBrandConfig(host);
    const initial = !onDefaultHost && !isVendorBranding(stored) ? stored : DEFAULT_BRAND_CONFIG;
    if (initial !== DEFAULT_BRAND_CONFIG) {
      applyBrandColors(initial);
      applyFavicon(initial.favicon_url);
    }

    const publish = (config: BrandConfig, ready: boolean) => {
      if (!cancelled) setState({ config, host, ready });
    };

    /** Drops every override so the stylesheet's Rankoya palette wins. */
    function applyDefaultBrand() {
      clearBrandColors();
      applyFavicon(null);
      if (!onDefaultHost) {
        try {
          window.localStorage.removeItem(storageKey(host));
        } catch {
          // Nothing cached to clear.
        }
      }
      return DEFAULT_BRAND_CONFIG;
    }

    // The vendor host is never blocked on the lookup; it already looks right.
    // The state update happens in a microtask so it isn't a synchronous
    // setState inside this effect.
    void Promise.resolve().then(() => publish(initial, onDefaultHost));

    // Runs on every host: the backend answers "not found" for Rankoya's own
    // host, which is the signal to keep the stock palette.
    CustomDomainService.resolveDomain(host)
      .then((resolved) => {
        if (cancelled) return;
        if (!resolved) {
          publish(applyDefaultBrand(), true);
          return;
        }
        const merged = mergeBrandConfig(
          stored,
          resolved.config,
          resolved.config?.brand_name ?? resolved.workspace?.name ?? null,
        );
        applyBrandColors(merged);
        applyFavicon(merged.favicon_url);
        applyDefaultTheme(merged.default_theme, setThemeRef.current);
        writeStoredBrandConfig(host, merged);
        publish(merged, true);
      })
      .catch(() => {
        // A 404 and an outage look the same here. On the vendor host fall back
        // to stock branding; on a tenant host keep whatever is painted rather
        // than flashing to vendor colours because one request failed.
        publish(onDefaultHost ? applyDefaultBrand() : initial, true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = React.useMemo<BrandContextValue>(
    () => ({
      brandConfig: state.config,
      currentHost: state.host,
      isCustomDomain: Boolean(state.host) && !isDefaultAppHost(state.host),
      isBrandReady: state.ready,
    }),
    [state],
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrandConfig(): BrandContextValue {
  const context = React.useContext(BrandContext);
  if (context === undefined) {
    throw new Error("useBrandConfig must be used within a BrandProvider");
  }
  return context;
}
