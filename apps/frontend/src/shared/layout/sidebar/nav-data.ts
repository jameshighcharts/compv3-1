import type { ComponentType } from "react";
import {
  IconBug,
  IconChartFunnel,
  IconChecklist,
  IconCode,
  IconLayoutDashboard,
  IconLockAccess,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";

type SidebarSubItem = {
  title: string;
  href: string;
};

export type SidebarNavItem = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  subItems?: SidebarSubItem[];
  defaultOpen?: boolean;
  collapsible?: boolean;
  hidden?: boolean;
};

export const navGeneral: SidebarNavItem[] = [
  {
    title: "Dashboard",
    icon: IconLayoutDashboard,
    defaultOpen: true,
    subItems: [
      { title: "Sales", href: "/" },
      // { title: "Marketing", href: "/dashboard-2" },
      { title: "ARR Template", href: "/vikingsaas" },
      // { title: "Dashboard 3", href: "/dashboard-3" },
    ],
  },
  {
    title: "Sales Pipeline",
    icon: IconChartFunnel,
    defaultOpen: true,
    subItems: [
      { title: "Pipeline", href: "/sales-pipeline" },
      { title: "Daily Scorecards", href: "/daily-scorecards" },
    ],
  },
  {
    title: "Adhocs & Tasks",
    href: "/tasks",
    icon: IconChecklist,
    hidden: true,
  },
  {
    title: "Users",
    href: "/users",
    icon: IconUsers,
    hidden: true,
  },
];

export const navPages: SidebarNavItem[] = [
  { title: "Auth", icon: IconLockAccess, collapsible: true, hidden: true },
  { title: "Errors", icon: IconBug, collapsible: true, hidden: true },
];

export const navOther: SidebarNavItem[] = [
  { title: "Settings", icon: IconSettings, collapsible: true, hidden: true },
  { title: "Developers", icon: IconCode, collapsible: true, hidden: true },
];
