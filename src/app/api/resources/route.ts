import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { parseBody, parseQuery, route } from "@/lib/api";
import { resourceCreateSchema, resourceListQuery } from "@/lib/validation";
import { createResource, listResources } from "@/lib/services/resources";

export const GET = route(async (req: Request) => {
  await requireUser();
  const { includeInactive } = parseQuery(req, resourceListQuery);
  return NextResponse.json({ resources: await listResources({ includeInactive }) });
});

export const POST = route(async (req: Request) => {
  await requireAdmin();
  const input = await parseBody(req, resourceCreateSchema);
  return NextResponse.json({ resource: await createResource(input) }, { status: 201 });
});
