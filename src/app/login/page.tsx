import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LoginPicker } from "@/components/LoginPicker";

export const metadata = { title: "Choose a user" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold tracking-tight">Who are you?</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
        This demo has no passwords. Pick a person to see the app as them. Administrators can manage
        resources and every reservation; members manage their own.
      </p>
      {users.length === 0 ? (
        <p className="panel mt-6 p-4 text-sm">
          No users yet. Run <code>npm run db:seed</code> to create sample data.
        </p>
      ) : (
        <LoginPicker users={users} />
      )}
    </div>
  );
}
