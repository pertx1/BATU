import { requireOnboardedUser } from "@/lib/auth/session";
import { TabBar } from "@/components/app/tab-bar";
import { Fab } from "@/components/app/fab";
import { ToastProvider } from "@/components/ui/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireOnboardedUser();
  return (
    <ToastProvider>
      <div className="min-h-dvh" style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom) + 5rem)" }}>
        {children}
        <Fab />
        <TabBar />
      </div>
    </ToastProvider>
  );
}
