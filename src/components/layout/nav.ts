import {
  ChartColumnIcon,
  FileTextIcon,
  LayoutGridIcon,
  ListChecksIcon,
  MegaphoneIcon,
  MessageCircleIcon,
  PlugIcon,
  RadarIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  TrendingUpIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export type NavKey =
  | "overview"
  | "visibility"
  | "rankings"
  | "competitors"
  | "audit"
  | "actions"
  | "content"
  | "social"
  | "agent"
  | "integrations"
  | "reports"
  | "settings";

export type NavItem = { key: NavKey; icon: LucideIcon; soon?: boolean };
export type NavGroup = { key: "insights" | "grow" | "workspace"; items: NavItem[] };

/** Groups and order follow the sidebar mockup; Social is a P1 stub. */
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
      { key: "content", icon: FileTextIcon },
      { key: "agent", icon: MessageCircleIcon },
      { key: "social", icon: MegaphoneIcon, soon: true },
    ],
  },
  {
    key: "workspace",
    items: [
      { key: "integrations", icon: PlugIcon },
      { key: "reports", icon: ChartColumnIcon },
      { key: "settings", icon: SlidersHorizontalIcon },
    ],
  },
];

export const navKeys = navGroups.flatMap((g) => g.items.map((i) => i.key));

export const isNavKey = (value: string): value is NavKey => (navKeys as string[]).includes(value);

export const brandHref = (brandSlug: string, path: string) => `/${brandSlug}/${path}`;

/** The active section is the first segment after the brand. */
export function activeNavKey(pathname: string): NavKey | undefined {
  const section = pathname.split("/")[2];
  return section && isNavKey(section) ? section : undefined;
}
