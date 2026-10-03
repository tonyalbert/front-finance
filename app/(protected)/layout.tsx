import { AuthGuard } from "@/components/auth/auth-guard"
import { AppShell } from "@/components/dashboard/app-shell"
import { PeriodProvider } from "@/components/dashboard/period-provider"

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PeriodProvider>
        <AppShell>{children}</AppShell>
      </PeriodProvider>
    </AuthGuard>
  )
}
