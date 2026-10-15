import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CircleDollarSignIcon,
  FileTextIcon,
  KeyRoundIcon,
  LayoutGridIcon,
  Link2Icon,
  ListChecksIcon,
  MessageCircleIcon,
  PlugIcon,
  RadarIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  StoreIcon,
  TrendingUpIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import { canUseAgencyResources, canUseResellerConsole, type PlanAccessSession } from "@/lib/plan-core";

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
 * Groups follow the growth loop: see where you stand (Insights), act on it
 * (Grow), and connect and run the tools (Workspace). Keywords, Articles and
 * Calendar follow the content pipeline in order: discover and analyze
 * keywords, research one and write the article, then schedule it. Every brand screen is
 * backed by live endpoints; Social and Reports have none yet, so they stay
 * out of the sidebar until they do.
 */
export const navGroups: NavGroup[] = [
  {
    key: "insights",
    items: [
      { key: "overview", icon: LayoutGridIcon },
      { key: "visibility", icon: RadarIcon },
      { key: "rankings", icon: TrendingUpIcon },
      { key: "competitors", icon: UsersIcon },
      { key: "audit", icon: ShieldCheckIcon },
    ],
  },
  {
    key: "grow",
    items: [
      { key: "actions", icon: ListChecksIcon },
      { key: "keywords", icon: KeyRoundIcon },
      { key: "articles", icon: FileTextIcon },
      { key: "calendar", icon: CalendarDaysIcon },
      { key: "money", icon: CircleDollarSignIcon },
      { key: "authority", icon: Link2Icon },
      { key: "agent", icon: MessageCircleIcon },
      // No endpoints yet; restore with MegaphoneIcon when the backend ships social publishing.
      // { key: "social", icon: MegaphoneIcon, soon: true },
    ],
  },
  {
    key: "workspace",
    items: [
      { key: "integrations", icon: PlugIcon },
      { key: "tools", icon: WrenchIcon },
      // No endpoints yet; restore with ChartColumnIcon when the backend ships reports.
      // { key: "reports", icon: ChartColumnIcon },
      { key: "resellers", icon: StoreIcon, href: "/resellers", visible: canUseResellerConsole },
      { key: "agency", icon: BriefcaseBusinessIcon, href: "/agency", visible: canUseAgencyResources },
      { key: "settings", icon: SlidersHorizontalIcon, href: "/settings" },
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
