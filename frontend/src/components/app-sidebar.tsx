"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  IconMoon,
  IconSearch,
  IconSun,
} from "@tabler/icons-react"
import { ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { SidebarNavGroup } from "@/components/sidebar/nav-group"
import { navGeneral, navOther, navPages } from "@/components/sidebar/nav-data"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const visiblePages = navPages.filter((item) => !item.hidden)
  const visibleOther = navOther.filter((item) => !item.hidden)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-1.5">
          <SidebarTrigger className="size-8 shrink-0 rounded-md border border-sidebar-border/60" />
          <SidebarMenu className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Image
                    src="/highcharts.svg"
                    alt="Highcharts"
                    width={16}
                    height={16}
                    className="size-4"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">HC Compass</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>

        <div className="flex items-center gap-2 px-1 pb-1 group-data-[collapsible=icon]:hidden">
          <Button
            variant="outline"
            className="h-8 flex-1 justify-start gap-2 rounded-md px-2 text-xs text-muted-foreground"
          >
            <IconSearch className="size-3.5" />
            <span>Search</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <IconSun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <IconMoon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNavGroup label="General" items={navGeneral} pathname={pathname} />
        {visiblePages.length > 0 ? (
          <SidebarNavGroup label="Pages" items={visiblePages} pathname={pathname} />
        ) : null}
        {visibleOther.length > 0 ? (
          <SidebarNavGroup label="Other" items={visibleOther} pathname={pathname} />
        ) : null}
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-2 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Link href="/signin">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">S</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Slack Auth</span>
                  <span className="truncate text-xs">Connect or disconnect</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
