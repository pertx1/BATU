import { requireUser } from "@/lib/auth/session";
import { TabBar } from "@/components/app/tab-bar";
import { Fab } from "@/components/app/fab";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="min-h-dvh" style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom) + 5rem)" }}>
      {children}
      <Fab />
      <TabBar />
    </div>
  );
}
