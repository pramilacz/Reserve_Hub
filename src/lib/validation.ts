import { z } from "zod";
import { isValidDateStr } from "./time";

export const RESOURCE_TYPES = ["ROOM", "EQUIPMENT", "VEHICLE", "OTHER"] as const;
export const RESERVATION_STATUSES = ["CONFIRMED", "CANCELLED"] as const;

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

/** Strict ISO-8601 instant with timezone, e.g. 2026-10-12T04:00:00.000Z */
const instant = z.iso
  .datetime({ offset: true, message: "Must be an ISO 8601 date-time" })
  .transform((s) => new Date(s));

const dateStr = z.string().refine(isValidDateStr, "Must be a date in YYYY-MM-DD format");

/* ----------------------------- Resources ----------------------------- */

export const resourceCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  type: z.enum(RESOURCE_TYPES),
  location: optionalText(120),
  capacity: z.number().int().min(1).max(10_000).nullable().optional(),
  description: optionalText(500),
});

export const resourceUpdateSchema = resourceCreateSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });

export const resourceListQuery = z.object({
  includeInactive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

/* --------------------------- Reservations ---------------------------- */

export const reservationCreateSchema = z.object({
  resourceId: z.string().min(1, "Choose a resource"),
  title: z.string().trim().min(1, "Enter a title").max(120),
  notes: optionalText(500),
  startTime: instant,
  endTime: instant,
});

export const reservationUpdateSchema = z.object({
  resourceId: z.string().min(1).optional(),
  title: z.string().trim().min(1, "Enter a title").max(120).optional(),
  notes: optionalText(500),
  startTime: instant.optional(),
  endTime: instant.optional(),
});

export const reservationListQuery = z.object({
  resourceId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  status: z.enum(RESERVATION_STATUSES).optional(),
  /** Inclusive local dates (org timezone). */
  from: dateStr.optional(),
  to: dateStr.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateQuery = z.object({ date: dateStr });
export const statsQuery = z.object({
  days: z.coerce.number().int().refine((n) => [7, 30, 90].includes(n), "Must be 7, 30 or 90").default(30),
});

export type ResourceCreateInput = z.infer<typeof resourceCreateSchema>;
export type ResourceUpdateInput = z.infer<typeof resourceUpdateSchema>;
export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;
export type ReservationUpdateInput = z.infer<typeof reservationUpdateSchema>;
export type ReservationListQuery = z.infer<typeof reservationListQuery>;
