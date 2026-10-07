import { AuthGuard } from "@/components/auth/auth-guard"
import { BillingProvider } from "@/components/billing/billing-provider"
import { AppShell } from "@/components/dashboard/app-shell"
import { PeriodProvider } from "@/components/dashboard/period-provider"

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <BillingProvider>
        <PeriodProvider>
          <AppShell>{children}</AppShell>
        </PeriodProvider>
      </BillingProvider>
    </AuthGuard>
  )
}
