import { AuthGuard } from "@/components/auth/auth-guard"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { BottomNav } from "@/components/dashboard/bottom-nav"

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="relative min-h-screen bg-background">
        {/* Background glows — fixed, use primary color */}
        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
          <div className="absolute left-1/4 top-0 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-primary/5 blur-[130px]" />
          <div className="absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[110px]" />
          <div className="absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/[0.03] blur-[120px]" />
        </div>

        {/* Desktop sidebar — fixed left column */}
        <div className="fixed inset-y-0 left-0 z-40 hidden w-60 md:flex md:flex-col">
          <AppSidebar />
        </div>

        {/* Main content — offset by sidebar width on desktop */}
        <div className="relative z-10 md:pl-60">
          {children}
        </div>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    </AuthGuard>
  )
}
