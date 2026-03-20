import type { Metadata } from "next"
import "./globals.css"
import { AppShell } from "@/shared/layout/app-shell"
import { ThemeProvider } from "@/shared/layout/theme-provider"

export const metadata: Metadata = {
  title: "Compass",
  description: "Compass",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
