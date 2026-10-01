/**
 * Pruebas de aislamiento entre usuarios contra un servidor real.
 *
 *   npm run build && npm run start      # con una base de datos de pruebas
 *   npm run test:security               # TEST_BASE_URL=http://localhost:3000 por defecto
 *
 * El usuario A crea un dato de cada tipo; el usuario B ataca TODOS los
 * endpoints con los ids de A. Después se comprueba, con la exportación
 * completa de A, que no ha cambiado absolutamente nada.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BODY_ATTACKS, FOREIGN_ID_ATTACKS, SELF_ENDPOINTS, type VictimIds } from "./matrix";

const BASE = (process.env.TEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = "Prueba-segura-123";
/** Marca única en todos los textos de A: si aparece en una respuesta a B, hay una fuga. */
const MARK = "zqxvictima";
const LEAK = new RegExp(MARK);

class Client {
  cookie = "";
  constructor(public origin = BASE) {}

  async req(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}) {
    const res = await fetch(BASE + path, {
      method,
      redirect: "manual",
      headers: {
        Origin: this.origin,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...extraHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.getSetCookie().find((c) => c.startsWith("antola_session="));
    if (setCookie) this.cookie = setCookie.split(";")[0];
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, json, text };
  }

  async ok(method: string, path: string, body?: unknown) {
    const r = await this.req(method, path, body);
    if (r.status >= 400) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(r.json)}`);
    return r.json;
  }
}

async function newUser(label: string) {
  const c = new Client();
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@aislamiento.test`;
  await c.ok("POST", "/api/auth/register", { email, password: PASSWORD, acceptPrivacy: true, timezone: "Europe/Madrid" });
  await c.ok("POST", "/api/onboarding", {
    name: label,
    timezone: "Europe/Madrid",
    morningTime: "08:00",
    eveningTime: "21:30",
    projects: [],
  });
  return { c, email };
}

/** Exportación de A sin los campos que cambian solos (última actividad, hora). */
async function snapshot(c: Client) {
  const data = await c.ok("GET", "/api/account/export");
  delete data.exportadoEl;
  delete data.cuenta.lastActiveAt;
  return data;
}

let A: Client;
let B: Client;
const created: Client[] = [];
let victim: VictimIds;
let before: unknown;

beforeAll(async () => {
  const health = await fetch(BASE + "/api/salud").catch(() => null);
  if (!health) throw new Error(`No hay servidor en ${BASE}. Arranca la app antes (npm run start).`);

  const a = await newUser("victima");
  const b = await newUser("atacante");
  A = a.c;
  B = b.c;
  created.push(A, B);

  const project = await A.ok("POST", "/api/projects", { name: `Proyecto ${MARK}`, color: "#5b4cf0", emoji: null });
  const goal = await A.ok("POST", "/api/goals", { title: `Objetivo ${MARK}`, type: "NUMERIC", startValue: 0, targetValue: 10, unit: "km" });
  const milestoneGoal = await A.ok("POST", "/api/goals", { title: `Hitos ${MARK}`, type: "MILESTONES", milestones: ["Paso 1"] });
  const task = await A.ok("POST", "/api/tasks", {
    title: `Tarea ${MARK}`,
    dueDate: "2026-09-22",
    projectId: project.id,
    goalId: goal.id,
    reminderMode: "AT_TIME",
    reminderDate: "2030-01-01",
    reminderTime: "09:00",
    subtasks: [`Subtarea ${MARK}`],
  });
  const taskView = await A.ok("GET", `/api/tasks/${task.id}`);
  const habit = await A.ok("POST", "/api/habits", { name: `Hábito ${MARK}`, daysOfWeek: [], reminderTime: "07:00" });
  await A.ok("POST", `/api/habits/${habit.id}/toggle`, { date: "2026-09-20", done: true });
  const event = await A.ok("POST", "/api/events", { title: `Evento ${MARK}`, startDate: "2030-02-01", startTime: "10:00", reminderMinutesBefore: 15 });
  const log = await A.ok("POST", `/api/goals/${goal.id}/progress`, { value: 3, date: "2026-09-15" });
  const milestone = await A.ok("POST", `/api/goals/${milestoneGoal.id}/milestones`, { title: "Paso 2" });
  await A.ok("POST", `/api/goals/${goal.id}/focus`, { focus: true });
  const review = await A.ok("POST", "/api/reviews", { weekStart: "2026-09-14", nextWeekFocus: `Plan ${MARK}`, notes: `Nota ${MARK}` });
  const idea = await A.ok("POST", "/api/ideas", { text: `Idea ${MARK}` });
  const pushEndpoint = `https://web.push.apple.com/aislamiento-${Date.now()}`;
  await A.ok("POST", "/api/push/subscribe", { endpoint: pushEndpoint, keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } });

  victim = {
    project: project.id,
    task: task.id,
    subtask: taskView.subtasks[0].id,
    habit: habit.id,
    event: event.id,
    goal: goal.id,
    milestoneGoal: milestoneGoal.id,
    milestone: milestone.id,
    progressLog: log.id,
    review: review.id,
    idea: idea.id,
    // B no es admin: el endpoint de admin debe dar 404 con cualquier id.
    userId: "cuser00000000000000000000",
    pushEndpoint,
  };
  before = await snapshot(A);
}, 60_000);

// Las pruebas no dejan nada: cada usuario de prueba borra su cuenta al terminar.
afterAll(async () => {
  for (const c of created) {
    const r = await c.req("DELETE", "/api/account", { password: PASSWORD, confirm: "ELIMINAR" });
    expect(r.status, `no se pudo borrar un usuario de prueba: ${r.text}`).toBe(200);
  }
});

describe("aislamiento entre usuarios", () => {
  it.each(FOREIGN_ID_ATTACKS.map((a) => [`${a.method} ${a.route}`, a] as const))(
    "B no puede usar %s con datos de A",
    async (_name, attack) => {
      const r = await B.req(attack.method, attack.path(victim), attack.body?.(victim));
      expect(attack.expect, `${attack.method} ${attack.path(victim)} → ${r.status} ${r.text.slice(0, 200)}`).toContain(r.status);
      // Nunca se filtra contenido de A en la respuesta.
      expect(r.text).not.toMatch(LEAK);
    },
  );

  it.each(BODY_ATTACKS.map((a) => [`${a.method} ${a.route}${a.note ? ` (${a.note})` : ""}`, a] as const))(
    "B no puede afectar a A mediante %s",
    async (_name, attack) => {
      const r = await B.req(attack.method, attack.path(victim), attack.body?.(victim));
      expect(attack.expect, `${attack.method} ${attack.route} → ${r.status} ${r.text.slice(0, 200)}`).toContain(r.status);
      expect(r.text).not.toMatch(LEAK);
      if (attack.route === "/api/tasks/reschedule") expect(r.json.updated).toBe(0);
    },
  );

  it("la revisión de B no cuenta las tareas de A", async () => {
    const exported = await B.ok("GET", "/api/account/export");
    const review = exported.revisionesSemanales.find((r: { weekStart: string }) => r.weekStart === "2026-09-21");
    expect(review.pendingCount).toBe(0);
    expect(JSON.stringify(review)).not.toMatch(LEAK);
  });

  it("la exportación de B no contiene nada de A", async () => {
    const text = JSON.stringify(await B.ok("GET", "/api/account/export"));
    for (const id of Object.values(victim)) expect(text).not.toContain(id);
    expect(text).not.toMatch(LEAK);
  });

  it("las páginas de A muestran «no encontrado» a B", async () => {
    for (const path of [
      `/tareas/${victim.task}`,
      `/calendario/evento/${victim.event}`,
      `/habitos/${victim.habit}`,
      `/objetivos/${victim.goal}`,
      `/objetivos/${victim.goal}/editar`,
      `/revision/${victim.review}`,
      "/admin",
    ]) {
      const r = await B.req("GET", path);
      // Con el esqueleto de carga la página empieza a enviarse antes de saber
      // que no existe (estado 200 o 404); lo que importa: «no encontrado» y nada de A.
      expect([200, 404], path).toContain(r.status);
      expect(r.text, path).toMatch(/No lo encontramos|NEXT_HTTP_ERROR_FALLBACK;404/);
      expect(r.text, path).not.toMatch(LEAK);
    }
  });

  it("los datos de A siguen exactamente igual tras todos los ataques", async () => {
    expect(await snapshot(A)).toEqual(before);
  });
});

describe("sin sesión", () => {
  const anon = new Client();
  const privateEndpoints = [
    ...FOREIGN_ID_ATTACKS.map((a) => ({ method: a.method, path: (v: VictimIds) => a.path(v) })),
    ...BODY_ATTACKS.map((a) => ({ method: a.method, path: (v: VictimIds) => a.path(v) })),
    ...SELF_ENDPOINTS.map((a) => ({ method: a.method, path: () => a.route })),
  ];

  it("todos los endpoints privados responden 401", async () => {
    for (const e of privateEndpoints) {
      const r = await anon.req(e.method, e.path(victim), e.method === "GET" ? undefined : {});
      expect(r.status, `${e.method} ${e.path(victim)}`).toBe(401);
    }
  });

  it("las páginas privadas redirigen al login", async () => {
    for (const path of ["/", "/tareas", "/calendario", "/habitos", "/objetivos", "/ajustes", "/cuenta", "/admin", `/tareas/${victim.task}`]) {
      const r = await anon.req("GET", path);
      expect(r.status, path).toBe(307);
    }
  });

  it("una cookie inventada no sirve", async () => {
    const fake = new Client();
    fake.cookie = "antola_session=inventada";
    expect((await fake.req("GET", `/api/tasks/${victim.task}`)).status).toBe(401);
    expect((await fake.req("GET", "/api/account/export")).status).toBe(401);
  });

  it("el cron exige su clave", async () => {
    expect((await anon.req("GET", "/api/cron/tick")).status).toBeGreaterThanOrEqual(401);
    expect((await anon.req("GET", "/api/cron/tick?key=adivina")).status).toBeGreaterThanOrEqual(401);
  });
});

describe("protecciones adicionales", () => {
  it("rechaza peticiones con sesión desde otro origen (CSRF)", async () => {
    const evil = new Client("https://malicioso.example");
    evil.cookie = B.cookie;
    const r = await evil.req("PATCH", "/api/account", { name: "csrf" });
    expect(r.status).toBe(403);
  });

  it("no acepta suscripciones push a servidores arbitrarios (SSRF)", async () => {
    const r = await B.req("POST", "/api/push/subscribe", { endpoint: "https://169.254.169.254/latest", keys: { p256dh: "x", auth: "y" } });
    expect(r.status).toBe(400);
  });

  it("recuperar contraseña no revela si un email existe", async () => {
    const anon = new Client();
    const r1 = await anon.req("POST", "/api/auth/forgot", { email: "no-existe-nunca@aislamiento.test" });
    const r2 = await anon.req("POST", "/api/auth/forgot", { email: (await A.ok("GET", "/api/account/export")).cuenta.email });
    expect(r1.status).toBe(200);
    expect(r1.json).toEqual(r2.json);
  });

  it("la exportación no incluye secretos", async () => {
    const text = JSON.stringify(await A.ok("GET", "/api/account/export"));
    expect(text).not.toMatch(/passwordHash|tokenHash|p256dh|"auth"|\$2[aby]\$/);
  });

  it("el login se bloquea tras 5 fallos", async () => {
    const anon = new Client();
    const email = `bloqueo-${Date.now()}@aislamiento.test`;
    const statuses: number[] = [];
    // IP propia (rango de documentación) para no bloquear al resto de pruebas.
    const ip = { "X-Forwarded-For": `203.0.113.${Math.floor(Math.random() * 250) + 1}` };
    for (let i = 0; i < 6; i++) {
      statuses.push((await anon.req("POST", "/api/auth/login", { email, password: "mala" }, ip)).status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });
});
