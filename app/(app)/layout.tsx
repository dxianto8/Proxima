import { AppShell } from "@/components/app-shell";

/**
 * Wraps the product itself in the sidebar-and-topbar chrome. The landing page
 * at `/` sits outside this group so it renders on a bare canvas.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
