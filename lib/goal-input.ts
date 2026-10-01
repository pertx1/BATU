import { z } from "zod";
import { dateStrSchema, idSchema } from "@/lib/validation";

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const optionalNumber = z.number().finite().gte(-1e12).lte(1e12).nullable().optional();

export const goalFieldsSchema = z.object({
  title: z.string().trim().min(1, "Escribe un título").max(200),
  description: optionalText(5000),
  why: optionalText(2000),
  deadline: dateStrSchema.nullable().optional(),
  projectId: idSchema.nullable().optional(),
  type: z.enum(["NUMERIC", "MILESTONES", "TASKS"]),
  startValue: optionalNumber,
  targetValue: optionalNumber,
  unit: optionalText(30),
});

export const createGoalSchema = goalFieldsSchema
  .extend({ milestones: z.array(z.string().trim().min(1).max(200)).max(50).optional() })
  .refine((g) => g.type !== "NUMERIC" || g.targetValue != null, {
    message: "Indica la meta numérica",
    path: ["targetValue"],
  });

export const updateGoalSchema = goalFieldsSchema.partial().extend({
  status: z.enum(["ACTIVE", "PAUSED", "ACHIEVED"]).optional(),
});

export const progressSchema = z.object({
  value: z.number().finite().gte(-1e12).lte(1e12),
  date: dateStrSchema,
  note: optionalText(300),
});

export const milestoneSchema = z.object({ title: z.string().trim().min(1, "Escribe el hito").max(200) });

/** Texto vacío → null. */
export function blankToNull(s: string | null | undefined): string | null | undefined {
  if (s === undefined) return undefined;
  return s?.trim() ? s.trim() : null;
}
