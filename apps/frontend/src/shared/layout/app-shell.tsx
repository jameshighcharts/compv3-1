"use client"

import { usePathname } from "next/navigation"

import { AppSidebar } from "@/shared/layout/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/shared/ui/sidebar"
import { TooltipProvider } from "@/shared/ui/tooltip"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === "/signin"

  if (isAuthPage) {
    return children
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 px-4 pb-4 pt-2">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
