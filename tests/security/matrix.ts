/**
 * Matriz de aislamiento: TODOS los endpoints de la API y qué se espera cuando
 * el usuario B los usa contra datos del usuario A. La comprueba
 * tests/security/isolation.test.ts (contra un servidor real) y
 * tests/unit/route-coverage.test.ts falla si aparece un endpoint que no esté aquí.
 */

/** Ids de los datos del usuario A (la víctima). */
export type VictimIds = {
  project: string;
  task: string;
  subtask: string;
  habit: string;
  event: string;
  goal: string;
  milestoneGoal: string;
  milestone: string;
  progressLog: string;
  review: string;
  idea: string;
  water: string;
  userId: string;
  pushEndpoint: string;
};

export type Attack = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  /** Plantilla tal como está en app/api, p. ej. "/api/tasks/[id]". */
  route: string;
  /** Ruta real con los ids de A. */
  path: (v: VictimIds) => string;
  body?: (v: VictimIds) => unknown;
  /** Estados aceptables para B. */
  expect: number[];
  note?: string;
};

const NOT_FOUND = [404];

/** Endpoints que reciben un id en la URL: B nunca debe ver ni tocar los de A. */
export const FOREIGN_ID_ATTACKS: Attack[] = [
  { method: "GET", route: "/api/tasks/[id]", path: (v) => `/api/tasks/${v.task}`, expect: NOT_FOUND },
  { method: "PATCH", route: "/api/tasks/[id]", path: (v) => `/api/tasks/${v.task}`, body: () => ({ title: "hackeada" }), expect: NOT_FOUND },
  { method: "DELETE", route: "/api/tasks/[id]", path: (v) => `/api/tasks/${v.task}`, expect: NOT_FOUND },
  { method: "POST", route: "/api/tasks/[id]/complete", path: (v) => `/api/tasks/${v.task}/complete`, expect: NOT_FOUND },
  { method: "POST", route: "/api/tasks/[id]/uncomplete", path: (v) => `/api/tasks/${v.task}/uncomplete`, expect: NOT_FOUND },
  { method: "POST", route: "/api/tasks/[id]/snooze", path: (v) => `/api/tasks/${v.task}/snooze`, body: () => ({ minutes: 15 }), expect: NOT_FOUND },
  { method: "POST", route: "/api/tasks/[id]/subtasks", path: (v) => `/api/tasks/${v.task}/subtasks`, body: () => ({ title: "intrusa" }), expect: NOT_FOUND },
  { method: "PATCH", route: "/api/subtasks/[id]", path: (v) => `/api/subtasks/${v.subtask}`, body: () => ({ done: true }), expect: NOT_FOUND },
  { method: "DELETE", route: "/api/subtasks/[id]", path: (v) => `/api/subtasks/${v.subtask}`, expect: NOT_FOUND },
  { method: "PATCH", route: "/api/projects/[id]", path: (v) => `/api/projects/${v.project}`, body: () => ({ name: "hackeado" }), expect: NOT_FOUND },
  { method: "DELETE", route: "/api/projects/[id]", path: (v) => `/api/projects/${v.project}`, expect: NOT_FOUND },
  { method: "PATCH", route: "/api/habits/[id]", path: (v) => `/api/habits/${v.habit}`, body: () => ({ name: "hackeado" }), expect: NOT_FOUND },
  { method: "DELETE", route: "/api/habits/[id]", path: (v) => `/api/habits/${v.habit}`, expect: NOT_FOUND },
  { method: "POST", route: "/api/habits/[id]/toggle", path: (v) => `/api/habits/${v.habit}/toggle`, body: () => ({ done: true }), expect: NOT_FOUND },
  { method: "GET", route: "/api/events/[id]", path: (v) => `/api/events/${v.event}`, expect: NOT_FOUND },
  { method: "PATCH", route: "/api/events/[id]", path: (v) => `/api/events/${v.event}`, body: () => ({ title: "hackeado" }), expect: NOT_FOUND },
  { method: "DELETE", route: "/api/events/[id]", path: (v) => `/api/events/${v.event}`, expect: NOT_FOUND },
  { method: "POST", route: "/api/events/[id]/snooze", path: (v) => `/api/events/${v.event}/snooze`, body: () => ({ minutes: 60 }), expect: NOT_FOUND },
  { method: "PATCH", route: "/api/goals/[id]", path: (v) => `/api/goals/${v.goal}`, body: () => ({ title: "hackeado" }), expect: NOT_FOUND },
  { method: "DELETE", route: "/api/goals/[id]", path: (v) => `/api/goals/${v.goal}`, expect: NOT_FOUND },
  { method: "POST", route: "/api/goals/[id]/focus", path: (v) => `/api/goals/${v.goal}/focus`, body: () => ({ focus: false }), expect: NOT_FOUND },
  { method: "POST", route: "/api/goals/[id]/progress", path: (v) => `/api/goals/${v.goal}/progress`, body: () => ({ value: 1, date: "2026-01-01" }), expect: NOT_FOUND },
  { method: "POST", route: "/api/goals/[id]/milestones", path: (v) => `/api/goals/${v.milestoneGoal}/milestones`, body: () => ({ title: "intruso" }), expect: NOT_FOUND },
  { method: "PATCH", route: "/api/milestones/[id]", path: (v) => `/api/milestones/${v.milestone}`, body: () => ({ done: true }), expect: NOT_FOUND },
  { method: "DELETE", route: "/api/milestones/[id]", path: (v) => `/api/milestones/${v.milestone}`, expect: NOT_FOUND },
  { method: "DELETE", route: "/api/goal-progress/[id]", path: (v) => `/api/goal-progress/${v.progressLog}`, expect: NOT_FOUND },
  { method: "DELETE", route: "/api/reviews/[id]", path: (v) => `/api/reviews/${v.review}`, expect: NOT_FOUND },
  { method: "PATCH", route: "/api/ideas/[id]", path: (v) => `/api/ideas/${v.idea}`, body: () => ({ pinned: true }), expect: NOT_FOUND },
  { method: "DELETE", route: "/api/ideas/[id]", path: (v) => `/api/ideas/${v.idea}`, expect: NOT_FOUND },
  { method: "POST", route: "/api/ideas/[id]/task", path: (v) => `/api/ideas/${v.idea}/task`, expect: NOT_FOUND },
  { method: "DELETE", route: "/api/nutrition/water/[id]", path: (v) => `/api/nutrition/water/${v.water}`, expect: NOT_FOUND },
  // B no es admin: el panel no existe para él.
  { method: "POST", route: "/api/admin/users/[id]", path: (v) => `/api/admin/users/${v.userId}`, body: () => ({ disabled: true }), expect: NOT_FOUND },
];

/**
 * Endpoints sin id en la URL (actúan sobre el propio usuario). Se atacan
 * metiendo ids de A en el cuerpo: deben rechazarlos o ignorarlos.
 */
export const BODY_ATTACKS: Attack[] = [
  { method: "POST", route: "/api/tasks", path: () => "/api/tasks", body: (v) => ({ title: "x", projectId: v.project }), expect: NOT_FOUND, note: "proyecto ajeno" },
  { method: "POST", route: "/api/tasks", path: () => "/api/tasks", body: (v) => ({ title: "x", goalId: v.goal }), expect: NOT_FOUND, note: "objetivo ajeno" },
  { method: "POST", route: "/api/events", path: () => "/api/events", body: (v) => ({ title: "x", startDate: "2026-10-10", projectId: v.project }), expect: NOT_FOUND, note: "proyecto ajeno" },
  { method: "POST", route: "/api/goals", path: () => "/api/goals", body: (v) => ({ title: "x", type: "TASKS", projectId: v.project }), expect: NOT_FOUND, note: "proyecto ajeno" },
  // Los ids ajenos se ignoran: no se reprograma nada de A.
  { method: "POST", route: "/api/tasks/reschedule", path: () => "/api/tasks/reschedule", body: (v) => ({ ids: [v.task], dueDate: "2030-01-01" }), expect: [200] },
  // B solo puede borrar suscripciones suyas.
  { method: "DELETE", route: "/api/push/subscribe", path: () => "/api/push/subscribe", body: (v) => ({ endpoint: v.pushEndpoint }), expect: [200] },
  // La revisión de B no puede contar tareas de A.
  { method: "POST", route: "/api/reviews", path: () => "/api/reviews", body: (v) => ({ weekStart: "2026-09-21", nextWeekFocus: null, notes: null, pendingIds: [v.task] }), expect: [200] },
  // No se acepta un userId desde el cliente.
  { method: "PATCH", route: "/api/settings", path: () => "/api/settings", body: (v) => ({ userId: v.userId, dndEnabled: true }), expect: [400] },
];

/**
 * Endpoints que solo afectan a la propia cuenta de quien llama (no reciben
 * ids ajenos). Se comprueba que exigen sesión y que no tocan los datos de A.
 */
export const SELF_ENDPOINTS: Pick<Attack, "method" | "route">[] = [
  { method: "POST", route: "/api/projects" },
  { method: "POST", route: "/api/habits" },
  { method: "POST", route: "/api/ideas" },
  { method: "POST", route: "/api/antola/message" },
  { method: "POST", route: "/api/antola/shop" },
  { method: "POST", route: "/api/antola/wardrobe" },
  { method: "POST", route: "/api/nutrition/profile" },
  { method: "POST", route: "/api/nutrition/water" },
  { method: "POST", route: "/api/onboarding" },
  { method: "POST", route: "/api/push/subscribe" },
  { method: "POST", route: "/api/push/test" },
  { method: "PATCH", route: "/api/account" },
  { method: "DELETE", route: "/api/account" },
  { method: "POST", route: "/api/account/email" },
  { method: "POST", route: "/api/account/password" },
  { method: "DELETE", route: "/api/account/sessions" },
  { method: "GET", route: "/api/account/export" },
];

/** Públicos a propósito (con sus propias protecciones). */
export const PUBLIC_ENDPOINTS: Pick<Attack, "method" | "route">[] = [
  { method: "POST", route: "/api/auth/login" },
  { method: "POST", route: "/api/auth/register" },
  { method: "POST", route: "/api/auth/logout" },
  { method: "POST", route: "/api/auth/forgot" },
  { method: "POST", route: "/api/auth/reset" },
  { method: "GET", route: "/api/cron/tick" }, // ?key=CRON_SECRET
  { method: "GET", route: "/api/salud" }, // diagnóstico sin datos de usuarios
];

export function covered(): Set<string> {
  return new Set(
    [...FOREIGN_ID_ATTACKS, ...BODY_ATTACKS, ...SELF_ENDPOINTS, ...PUBLIC_ENDPOINTS].map((a) => `${a.method} ${a.route}`),
  );
}
