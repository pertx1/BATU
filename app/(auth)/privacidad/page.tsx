import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacidad" };

export default function PrivacyPage() {
  return (
    <article className="space-y-5 py-4 leading-relaxed">
      <Link href="/registro" className="text-sm font-semibold text-accent">← Volver</Link>
      <h1 className="text-2xl font-bold">Política de privacidad</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Qué datos guardamos</h2>
        <p className="text-muted">
          Tu email, tu nombre, una versión cifrada (hash) de tu contraseña y lo que tú mismo
          apuntas en Antola: proyectos, tareas, hábitos, eventos, objetivos, revisiones y ajustes.
          Si activas las notificaciones, guardamos la suscripción de cada dispositivo para poder
          enviarte avisos.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Para qué los usamos</h2>
        <p className="text-muted">
          Solo para que la app funcione: mostrarte tu información, enviarte los recordatorios
          que configures y, si lo pides, un email para recuperar la contraseña. No vendemos ni
          compartimos tus datos, no hay publicidad ni rastreadores.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Quién puede verlos</h2>
        <p className="text-muted">
          Solo tú. Cada cuenta está aislada de las demás. El administrador puede ver cuántas
          cuentas hay, su email, la fecha de registro y la última actividad, y desactivar una
          cuenta, pero no puede ver tus tareas ni ningún otro contenido.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Proveedores</h2>
        <p className="text-muted">
          Los datos se alojan en una base de datos PostgreSQL (Neon) y la app se sirve desde
          Vercel. Los emails se envían con Resend. Las notificaciones pasan por el servicio push
          de tu navegador (Apple en iPhone).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Tus derechos</h2>
        <p className="text-muted">
          Desde «Mi cuenta» puedes descargar todos tus datos en formato JSON, corregirlos o
          eliminar tu cuenta. Al eliminarla se borran de forma definitiva todos tus datos.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Cookies</h2>
        <p className="text-muted">
          Usamos una única cookie técnica para mantener tu sesión iniciada. No usamos cookies de
          análisis ni de publicidad.
        </p>
      </section>
    </article>
  );
}
