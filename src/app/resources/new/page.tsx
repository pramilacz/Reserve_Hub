import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/auth";
import { ResourceForm } from "@/components/ResourceForm";

export const metadata = { title: "Add resource" };

export default async function NewResourcePage() {
  const user = await requireUserOrRedirect();
  if (user.role !== "ADMIN") {
    return (
      <div className="panel max-w-xl p-6 text-sm">
        Only administrators can add resources. <Link className="link" href="/resources">Back to resources</Link>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Add resource</h1>
      <ResourceForm mode="create" initial={{ name: "", type: "ROOM", location: "", capacity: "", description: "", isActive: true }} />
    </div>
  );
}
