import { requireOnboardedUser } from "@/lib/auth/session";
import { antolaChrome } from "@/lib/gamification";
import { themeColors } from "@/lib/antola/shop";
import { TabBar } from "@/components/app/tab-bar";
import { Fab } from "@/components/app/fab";
import { GamificationProvider } from "@/components/antola/gamification-provider";
import { ToastProvider } from "@/components/ui/toast";
import { NavigationTracker } from "@/lib/client/navigation";

/** Colores del tema comprado en la tienda de Antola (claro y oscuro). */
function themeCss(itemId: string | null): string | null {
  const c = themeColors(itemId);
  if (!c) return null;
  const light = `--accent:${c.light.accent};--accent-soft:${c.light.soft};--accent-fg:#ffffff;`;
  const dark = `--accent:${c.dark.accent};--accent-soft:${c.dark.soft};--accent-fg:${c.dark.fg};`;
  return `:root{${light}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark}}}:root[data-theme="dark"]{${dark}}`;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  const chrome = await antolaChrome(user.id);
  const css = chrome.enabled ? themeCss(chrome.theme) : null;
  return (
    <ToastProvider>
      {/* Valores fijos del catálogo (nunca texto del usuario). */}
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      <GamificationProvider enabled={chrome.enabled} sounds={chrome.sounds} look={chrome.look}>
        <div className="min-h-dvh" style={{ paddingBottom: "calc(max(env(safe-area-inset-bottom), 12px) + 62px + 90px)" }}>
          {children}
          <NavigationTracker />
          <Fab />
          <TabBar />
        </div>
      </GamificationProvider>
    </ToastProvider>
  );
}
