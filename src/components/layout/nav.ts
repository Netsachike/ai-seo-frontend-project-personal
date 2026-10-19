import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  FileTextIcon,
  KeyRoundIcon,
  LayoutGridIcon,
  Link2Icon,
  PlugIcon,
  RadarIcon,
  ShieldCheckIcon,
  StoreIcon,
  TrendingUpIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import type { PlanAccessSession } from "@/lib/plan-core";

export type NavKey =
  | "overview"
  | "visibility"
  | "rankings"
  | "competitors"
  | "audit"
  | "actions"
  | "keywords"
  | "articles"
  | "calendar"
  | "money"
  | "authority"
  | "social"
  | "agent"
  | "integrations"
  | "tools"
  | "reports"
  | "resellers"
  | "agency"
  | "settings";

export type NavItem = {
  key: NavKey;
  icon: LucideIcon;
  soon?: boolean;
  /** Account-level screens live outside the brand, at a fixed path. */
  href?: string;
  /** Shown only to sessions that pass this check. */
  visible?: (session: PlanAccessSession | null | undefined) => boolean;
};
export type NavGroup = { key: "insights" | "grow" | "workspace"; items: NavItem[] };

/**
 * One short list, in the order people use it: see where you stand
 * (Overview, AI visibility, Rankings), connect your site (Integrations), then
 * find and fix what holds it back (Competitors, Site audit with money pages),
 * and grow (Keywords, Articles, Calendar, Authority).
 *
 * Kept out of the sidebar to keep it short, but still reachable:
 * - Action plan: from the Overview and the assistant.
 * - Ask Rankoya: the assistant drawer, which links to the full conversation.
 * - Settings: from the profile menu.
 * - Money pages: a tab on Site audit.
 * Social and Reports have no endpoints yet.
 */
export const navGroups: NavGroup[] = [
  {
    key: "insights",
    items: [
      { key: "overview", icon: LayoutGridIcon },
      { key: "visibility", icon: RadarIcon },
      { key: "rankings", icon: TrendingUpIcon },
      { key: "integrations", icon: PlugIcon },
      { key: "competitors", icon: UsersIcon },
      { key: "audit", icon: ShieldCheckIcon },
    ],
  },
  {
    key: "grow",
    items: [
      // { key: "actions", icon: ListChecksIcon },
      { key: "keywords", icon: KeyRoundIcon },
      { key: "articles", icon: FileTextIcon },
      { key: "calendar", icon: CalendarDaysIcon },
      // Now a tab on Site audit (audit?view=money).
      // { key: "money", icon: CircleDollarSignIcon },
      { key: "authority", icon: Link2Icon },
      // The assistant drawer opens it, with a link to the full conversation.
      // { key: "agent", icon: MessageCircleIcon },
      // No endpoints yet; restore with MegaphoneIcon when the backend ships social publishing.
      // { key: "social", icon: MegaphoneIcon, soon: true },
    ],
  },
  {
    key: "workspace",
    items: [
      { key: "tools", icon: WrenchIcon },
      // No endpoints yet; restore with ChartColumnIcon when the backend ships reports.
      // { key: "reports", icon: ChartColumnIcon },
      // Always listed: the pages explain what they are and how to unlock them.
      { key: "agency", icon: BriefcaseBusinessIcon, href: "/agency" },
      { key: "resellers", icon: StoreIcon, href: "/resellers" },
      // The profile menu and the sidebar's profile link open settings.
      // { key: "settings", icon: SlidersHorizontalIcon, href: "/settings" },
    ],
  },
];

export const navKeys = navGroups.flatMap((g) => g.items.map((i) => i.key));

/** Brand-scoped sections only: the ones that live under /[brand]/…. */
const brandNavKeys = navGroups.flatMap((g) => g.items.filter((i) => !i.href).map((i) => i.key));

export const isNavKey = (value: string): value is NavKey => (brandNavKeys as string[]).includes(value);

export const brandHref = (brandSlug: string, path: string) => `/${brandSlug}/${path}`;

export const navItemHref = (item: NavItem, brandSlug: string) => item.href ?? brandHref(brandSlug, item.key);

/** Account-level paths and the nav item they belong to. */
const accountSections: Array<[prefix: string, key: NavKey]> = [
  ["/settings", "settings"],
  ["/workspaces", "settings"],
  ["/upgrade", "settings"],
  ["/resellers", "resellers"],
  ["/agency", "agency"],
];

/** The active section: an account-level path, else the first segment after the brand. */
export function activeNavKey(pathname: string): NavKey | undefined {
  const account = accountSections.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (account) return account[1];
  const section = pathname.split("/")[2];
  return section && isNavKey(section) ? section : undefined;
}
