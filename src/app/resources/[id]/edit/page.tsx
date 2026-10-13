import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserOrRedirect } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { countUpcomingReservations, getResource } from "@/lib/services/resources";
import { ResourceForm } from "@/components/ResourceForm";

export const metadata = { title: "Edit resource" };

type Props = { params: Promise<{ id: string }> };

export default async function EditResourcePage({ params }: Props) {
  const user = await requireUserOrRedirect();
  const { id } = await params;

  if (user.role !== "ADMIN") {
    return (
      <div className="panel max-w-xl p-6 text-sm">
        Only administrators can edit resources. <Link className="link" href="/resources">Back to resources</Link>
      </div>
    );
  }

  let resource;
  try {
    resource = await getResource(id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const upcoming = await countUpcomingReservations(id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit {resource.name}</h1>
        {upcoming > 0 && (
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
            {upcoming} upcoming reservation{upcoming === 1 ? "" : "s"} for this resource.
          </p>
        )}
      </div>
      <ResourceForm
        mode="edit"
        initial={{
          id: resource.id,
          name: resource.name,
          type: resource.type,
          location: resource.location ?? "",
          capacity: resource.capacity?.toString() ?? "",
          description: resource.description ?? "",
          isActive: resource.isActive,
        }}
      />
    </div>
  );
}
