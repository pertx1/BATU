/**
 * Catálogo de logros. Las condiciones las evalúa el servidor
 * (lib/gamification.ts) con las métricas de cada usuario; lo conseguido se
 * guarda en UserAchievement.
 */

export type AchievementMetrics = {
  tasksDone: number;
  tasksToday: number;
  habitsDone: number;
  streak: number; // racha actual (incluye hoy si ya es productivo)
  productiveRun: number; // días productivos seguidos sin protector
  perfectDays: number;
  reviews: number;
  goalsCreated: number;
  goalsAchieved: number;
  accessories: number;
  level: number;
  challengesDone: number;
  earlyTask: boolean; // alguna tarea completada antes de las 8:00
  nightTask: boolean; // alguna tarea completada entre las 0:00 y las 5:00
  inboxZero: boolean; // la última acción dejó la bandeja a cero
};

export type MetricKey = keyof AchievementMetrics;

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  secret?: boolean;
  reward: { crumbs: number; shields?: number };
  needs: MetricKey[];
  test: (m: AchievementMetrics) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "primer-paso",
    name: "Primer paso",
    description: "Completa tu primera tarea.",
    icon: "👣",
    reward: { crumbs: 5 },
    needs: ["tasksDone"],
    test: (m) => m.tasksDone >= 1,
  },
  {
    id: "madrugadora",
    name: "Madrugadora",
    description: "Completa una tarea antes de las 8:00.",
    icon: "🌅",
    reward: { crumbs: 10 },
    needs: ["earlyTask"],
    test: (m) => m.earlyTask,
  },
  {
    id: "dia-perfecto",
    name: "Día perfecto",
    description: "Completa todo lo de un día: tareas y hábitos.",
    icon: "⭐",
    reward: { crumbs: 10 },
    needs: ["perfectDays"],
    test: (m) => m.perfectDays >= 1,
  },
  {
    id: "racha-7",
    name: "Racha de 7",
    description: "7 días productivos seguidos.",
    icon: "🔥",
    reward: { crumbs: 15, shields: 1 },
    needs: ["streak"],
    test: (m) => m.streak >= 7,
  },
  {
    id: "semana-perfecta",
    name: "Semana perfecta",
    description: "7 días productivos seguidos sin gastar protectores.",
    icon: "🌟",
    reward: { crumbs: 25 },
    needs: ["productiveRun"],
    test: (m) => m.productiveRun >= 7,
  },
  {
    id: "racha-30",
    name: "Racha de 30",
    description: "30 días productivos seguidos.",
    icon: "☄️",
    reward: { crumbs: 40, shields: 1 },
    needs: ["streak"],
    test: (m) => m.streak >= 30,
  },
  {
    id: "racha-100",
    name: "Racha de 100",
    description: "100 días productivos seguidos. Leyenda.",
    icon: "🏆",
    reward: { crumbs: 100, shields: 2 },
    needs: ["streak"],
    test: (m) => m.streak >= 100,
  },
  {
    id: "centenaria",
    name: "Centenaria",
    description: "Completa 100 tareas.",
    icon: "💯",
    reward: { crumbs: 30 },
    needs: ["tasksDone"],
    test: (m) => m.tasksDone >= 100,
  },
  {
    id: "constancia",
    name: "Constancia de hormiga",
    description: "Marca 50 hábitos.",
    icon: "🌱",
    reward: { crumbs: 20 },
    needs: ["habitsDone"],
    test: (m) => m.habitsDone >= 50,
  },
  {
    id: "planificadora",
    name: "Planificadora",
    description: "Haz 4 revisiones semanales.",
    icon: "🗓️",
    reward: { crumbs: 20 },
    needs: ["reviews"],
    test: (m) => m.reviews >= 4,
  },
  {
    id: "sonadora",
    name: "Soñadora",
    description: "Crea tu primer objetivo.",
    icon: "💭",
    reward: { crumbs: 5 },
    needs: ["goalsCreated"],
    test: (m) => m.goalsCreated >= 1,
  },
  {
    id: "lo-consegui",
    name: "¡Lo conseguí!",
    description: "Consigue un objetivo.",
    icon: "🏅",
    reward: { crumbs: 30 },
    needs: ["goalsAchieved"],
    test: (m) => m.goalsAchieved >= 1,
  },
  {
    id: "bandeja-vacia",
    name: "Bandeja vacía",
    description: "Deja la bandeja de entrada a cero.",
    icon: "📭",
    reward: { crumbs: 10 },
    needs: ["inboxZero"],
    test: (m) => m.inboxZero,
  },
  {
    id: "retadora",
    name: "Retadora",
    description: "Completa 5 retos semanales.",
    icon: "🎯",
    reward: { crumbs: 20 },
    needs: ["challengesDone"],
    test: (m) => m.challengesDone >= 5,
  },
  {
    id: "coleccionista",
    name: "Coleccionista",
    description: "Ten 10 accesorios para Antola.",
    icon: "🎒",
    reward: { crumbs: 30 },
    needs: ["accessories"],
    test: (m) => m.accessories >= 10,
  },
  {
    id: "nivel-5",
    name: "Exploradora",
    description: "Llega al nivel 5.",
    icon: "🧭",
    reward: { crumbs: 10 },
    needs: ["level"],
    test: (m) => m.level >= 5,
  },
  {
    id: "nivel-15",
    name: "Experta",
    description: "Llega al nivel 15.",
    icon: "⛑️",
    reward: { crumbs: 25, shields: 1 },
    needs: ["level"],
    test: (m) => m.level >= 15,
  },
  {
    id: "nivel-30",
    name: "Reina del hormiguero",
    description: "Llega al nivel 30.",
    icon: "👑",
    reward: { crumbs: 50 },
    needs: ["level"],
    test: (m) => m.level >= 30,
  },
  {
    id: "noctambula",
    name: "Noctámbula",
    description: "Completa una tarea entre las 0:00 y las 5:00.",
    icon: "🦉",
    secret: true,
    reward: { crumbs: 10 },
    needs: ["nightTask"],
    test: (m) => m.nightTask,
  },
  {
    id: "hormiga-obrera",
    name: "Hormiga obrera",
    description: "Completa 10 tareas en un mismo día.",
    icon: "🐜",
    secret: true,
    reward: { crumbs: 15 },
    needs: ["tasksToday"],
    test: (m) => m.tasksToday >= 10,
  },
];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
