import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { covered, PUBLIC_ENDPOINTS } from "../security/matrix";

const API_DIR = path.resolve(import.meta.dirname, "../../app/api");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === "route.ts" ? [full] : [];
  });
}

const handlers = routeFiles(API_DIR).flatMap((file) => {
  const route = "/api/" + path.relative(API_DIR, path.dirname(file)).split(path.sep).join("/");
  const source = readFileSync(file, "utf8");
  const methods = [...source.matchAll(/export (?:const|async function) (GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
  return methods.map((method) => ({ method, route, source }));
});

describe("cobertura de seguridad de la API", () => {
  it("hay endpoints que comprobar", () => {
    expect(handlers.length).toBeGreaterThan(30);
  });

  it("todos los endpoints están en la matriz de aislamiento", () => {
    const known = covered();
    const missing = handlers.map((h) => `${h.method} ${h.route}`).filter((k) => !known.has(k));
    expect(missing, "Añade estos endpoints a tests/security/matrix.ts").toEqual([]);
  });

  it("los endpoints privados usan withUser (userId desde la sesión)", () => {
    const publicKeys = new Set(PUBLIC_ENDPOINTS.map((p) => `${p.method} ${p.route}`));
    const unprotected = handlers
      .filter((h) => !publicKeys.has(`${h.method} ${h.route}`))
      .filter((h) => !new RegExp(`export const ${h.method} = withUser`).test(h.source))
      .map((h) => `${h.method} ${h.route}`);
    expect(unprotected).toEqual([]);
  });

  it("ningún endpoint lee un userId del cliente", () => {
    const offenders = handlers
      .filter((h) => /body\.userId|searchParams\.get\(["']userId|params\.userId/.test(h.source))
      .map((h) => h.route);
    expect(offenders).toEqual([]);
  });
});
