import "server-only";
import { db } from "@/lib/db";
import { dateStrToDb, localHour, startOfWeekMonday, todayStr, type DateStr } from "@/lib/dates";
import {
  antolaChrome,
  antolaSay,
  antolaSettings,
  closeDays,
  dailyTip,
  ensureStats,
  refreshChallenges,
  todaySituation,
  todayState,
  visibleStreak,
  xpHistory,
  type AntolaLook,
  type Said,
} from "@/lib/gamification";
import { ACHIEVEMENTS } from "@/lib/antola/achievements";
import { levelProgress, levelTitle, stageForLevel, STAGE_LABEL } from "@/lib/antola/levels";
import { count, type MessageVars } from "@/lib/antola/messages";
import { SHOP } from "@/lib/antola/shop";
import { MAX_SHIELDS } from "@/lib/antola/xp";
import type { TaskView } from "@/lib/types";

const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

/** Siguiente tarea propuesta: primero vencidas, luego prioridad y hora. */
export function suggestTask(overdue: TaskView[], today: TaskView[]): TaskView | null {
  const rank = (t: TaskView, isOverdue: boolean) => [isOverdue ? 0 : 1, PRIORITY_RANK[t.priority], t.time ?? 24 * 60] as const;
  const all = [
    ...overdue.map((t) => ({ t, k: rank(t, true) })),
    ...today.filter((t) => !t.completedAt).map((t) => ({ t, k: rank(t, false) })),
  ];
  all.sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.k[2] - b.k[2]);
  return all[0]?.t ?? null;
}

export type StatsSummary = {
  level: number;
  title: string;
  xp: number;
  ratio: number;
  needed: number;
  streak: number;
  bestStreak: number;
  shields: number;
  crumbs: number;
};

export type AntolaToday = {
  look: AntolaLook;
  say: Said;
  tip: Said | null;
  suggestion: { id: string; title: string; text: string } | null;
  overdue: { count: number; text: string } | null;
  stats: StatsSummary;
};

/** Antola en "Hoy" (null si la gamificación o Antola en Hoy están apagadas). */
export async function getAntolaToday(
  user: { id: string; timezone: string; name: string | null },
  today: DateStr,
  data: { overdue: TaskView[]; tasks: TaskView[]; progress: { done: number; total: number } },
  now = new Date(),
): Promise<AntolaToday | null> {
  const settings = await antolaSettings(user.id);
  if (!settings.gamificationEnabled || !settings.antolaOnToday) return null;
  await ensureStats(user.id, user.timezone, now);
  await closeDays(user.id, user.timezone, now);
  const [stats, state, chrome] = await Promise.all([
    db.userStats.findUniqueOrThrow({ where: { userId: user.id } }),
    todayState(db, user.id, user.timezone, now),
    antolaChrome(user.id),
  ]);
  const streak = visibleStreak(stats, state);
  const pending = data.progress.total - data.progress.done;
  const situation = todaySituation({
    hour: localHour(now, user.timezone),
    complete: state.complete,
    productive: state.productive,
    streak,
    overdue: data.overdue.length,
    pending,
    total: data.progress.total,
    completed: data.progress.done,
  });
  const vars: MessageVars = {
    nombre: user.name,
    tareas: count(data.tasks.length, "tarea", "tareas"),
    pendientes: count(pending, "cosa", "cosas"),
    completadas: count(data.progress.done, "cosa", "cosas"),
    vencidas: count(data.overdue.length, "tarea vencida", "tareas vencidas"),
    racha: streak,
    nivel: stats.level,
  };
  const tone = settings.antolaTone;
  const next = situation === "noche" || situation === "dia_completo" ? null : suggestTask(data.overdue, data.tasks);
  const [say, tip, suggestionSay, overdueSay] = await Promise.all([
    antolaSay(user.id, situation, vars, tone, { stable: true, now }),
    dailyTip(user.id, user.timezone, tone, now),
    next ? antolaSay(user.id, "sugerencia", { tarea: next.title }, tone, { stable: true, now }) : null,
    data.overdue.length ? antolaSay(user.id, "propuesta_vencidas", {}, tone, { stable: true, now }) : null,
  ]);
  const p = levelProgress(stats.xp);
  return {
    look: chrome.look,
    say,
    tip,
    suggestion: next && suggestionSay ? { id: next.id, title: next.title, text: suggestionSay.text } : null,
    overdue: data.overdue.length && overdueSay ? { count: data.overdue.length, text: overdueSay.text } : null,
    stats: {
      level: p.level,
      title: levelTitle(p.level),
      xp: stats.xp,
      ratio: p.ratio,
      needed: p.needed,
      streak,
      bestStreak: Math.max(stats.bestStreak, streak),
      shields: stats.streakShields,
      crumbs: stats.crumbs,
    },
  };
}

/** Todo lo de la pantalla de Antola. */
export async function getAntolaProfile(user: { id: string; timezone: string; name: string | null }, now = new Date()) {
  const settings = await antolaSettings(user.id);
  await ensureStats(user.id, user.timezone, now);
  await closeDays(user.id, user.timezone, now);
  await refreshChallenges(user.id, user.timezone, now);
  const weekStart = startOfWeekMonday(todayStr(user.timezone, now));
  const [stats, state, unlocked, items, challenges, history] = await Promise.all([
    db.userStats.findUniqueOrThrow({ where: { userId: user.id } }),
    todayState(db, user.id, user.timezone, now),
    db.userAchievement.findMany({ where: { userId: user.id }, select: { achievementId: true, unlockedAt: true } }),
    db.userItem.findMany({ where: { userId: user.id }, select: { itemId: true, equipped: true } }),
    db.weeklyChallenge.findMany({ where: { userId: user.id, weekStart: dateStrToDb(weekStart) }, orderBy: { slot: "asc" } }),
    xpHistory(user.id, user.timezone, now),
  ]);
  const streak = visibleStreak(stats, state);
  const tap = await antolaSay(user.id, "toque", { nombre: user.name, nivel: stats.level, racha: streak }, settings.antolaTone, { stable: true, now });
  const p = levelProgress(stats.xp);
  const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));
  const owned = new Map(items.map((i) => [i.itemId, i.equipped]));
  const equipped = items.filter((i) => i.equipped).map((i) => i.itemId);
  const stage = stageForLevel(p.level);
  return {
    enabled: settings.gamificationEnabled,
    greeting: tap.text,
    look: { stage, accessories: equipped.filter((id) => SHOP.find((s) => s.id === id)?.kind === "accessory") },
    stageLabel: STAGE_LABEL[stage],
    stats: {
      level: p.level,
      title: levelTitle(p.level),
      xp: stats.xp,
      ratio: p.ratio,
      needed: p.needed,
      into: p.into,
      span: p.to - p.from,
      streak,
      bestStreak: Math.max(stats.bestStreak, streak),
      shields: stats.streakShields,
      maxShields: MAX_SHIELDS,
      crumbs: stats.crumbs,
    } satisfies StatsSummary & { into: number; span: number; maxShields: number },
    achievements: ACHIEVEMENTS.map((a) => {
      const at = unlockedMap.get(a.id);
      return {
        id: a.id,
        name: at || !a.secret ? a.name : "???",
        description: at || !a.secret ? a.description : "Logro secreto. Sigue usando la app y lo descubrirás.",
        icon: at || !a.secret ? a.icon : "❔",
        unlocked: !!at,
        unlockedAt: at?.toISOString() ?? null,
        crumbs: a.reward.crumbs,
        shields: a.reward.shields ?? 0,
      };
    }),
    challenges: challenges.map((c) => ({
      id: c.id,
      label: c.label,
      progress: Math.min(c.progress, c.target),
      target: c.target,
      rewardXp: c.rewardXp,
      rewardCrumbs: c.rewardCrumbs,
      done: !!c.completedAt,
    })),
    shop: SHOP.map((i) => ({
      id: i.id,
      kind: i.kind,
      name: i.name,
      description: i.description,
      price: i.price,
      minLevel: i.minLevel ?? 1,
      owned: owned.has(i.id),
      equipped: owned.get(i.id) ?? false,
      colors: i.kind === "theme" ? i.colors : null,
      slot: i.kind === "accessory" ? i.slot : null,
    })),
    history,
    weekStart,
  };
}

export type AntolaProfile = Awaited<ReturnType<typeof getAntolaProfile>>;
