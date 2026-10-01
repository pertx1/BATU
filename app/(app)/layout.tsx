import { requireOnboardedUser } from "@/lib/auth/session";
import { TabBar } from "@/components/app/tab-bar";
import { Fab } from "@/components/app/fab";
import { ToastProvider } from "@/components/ui/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireOnboardedUser();
  return (
    <ToastProvider>
      <div className="min-h-dvh" style={{ paddingBottom: "calc(max(env(safe-area-inset-bottom), 12px) + 62px + 90px)" }}>
        {children}
        <Fab />
        <TabBar />
      </div>
    </ToastProvider>
  );
}
