import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "antola_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

// Rutas accesibles sin sesión. La validación real de la sesión se hace en el
// servidor (getCurrentSession); aquí solo se redirige rápido si no hay cookie.
const PUBLIC_PATHS = ["/login", "/registro", "/recuperar", "/restablecer", "/privacidad"];
const PUBLIC_API_PREFIXES = ["/api/auth/", "/api/cron/", "/api/salud"];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (isPublic(pathname)) return NextResponse.next();

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No has iniciado sesión" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Renueva la caducidad de la cookie para que la app instalada no pida login.
  const response = NextResponse.next();
  if (!pathname.startsWith("/api/")) {
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }
  return response;
}

export const config = {
  matcher: [
    // Todo excepto estáticos, manifest, iconos y service worker.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html|icons/|apple-touch-icon).*)",
  ],
};
