import type { ResourceType } from "@prisma/client";

export const TYPE_LABEL: Record<ResourceType, string> = {
  ROOM: "Room",
  EQUIPMENT: "Equipment",
  VEHICLE: "Vehicle",
  OTHER: "Other",
};

export const TYPE_GROUP_LABEL: Record<ResourceType, string> = {
  ROOM: "Rooms",
  EQUIPMENT: "Equipment",
  VEHICLE: "Vehicles",
  OTHER: "Other",
};

type Params = Record<string, string | string[] | undefined>;

/** Next.js gives string | string[] | undefined for query params; we want one string. */
export function first(params: Params, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}
