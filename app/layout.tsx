import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { OfflineBanner } from "@/components/offline-banner";
import { ThemeSync } from "@/components/theme-sync";
import { THEME_COLORS, themeScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: { default: "Antola", template: "%s · Antola" },
  description: "Organiza tu día a día: tareas, hábitos, calendario y objetivos.",
  applicationName: "Antola",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Antola",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: el script de abajo pone data-theme antes de hidratar.
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Tema elegido en Ajustes, aplicado antes de pintar (sin destello). */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ThemeSync />
        <OfflineBanner />
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
