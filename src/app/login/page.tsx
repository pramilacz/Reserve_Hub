import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/Logo";
import { LoginPicker } from "@/components/LoginPicker";

export const metadata = { title: "Welcome" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <div>
      <div className="anim-rise flex justify-center">
        <Logo size={52} />
      </div>
      <h1 className="anim-rise mt-8 text-center text-2xl font-extrabold tracking-tight" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        Book it. Never double-book it.
      </h1>
      <p className="anim-rise mt-2 text-center text-sm" style={{ color: "var(--color-muted)", ["--i" as string]: 2 } as React.CSSProperties}>
        Rooms, equipment and vehicles in one place. This demo has no passwords: pick a person to continue.
        Administrators manage resources and every reservation; members manage their own.
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
