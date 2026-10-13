import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Nav } from "./Nav";
import { UserSwitcher } from "./UserSwitcher";

export async function Header() {
  const user = await getCurrentUser();
  const users = user
    ? await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }], select: { id: true, name: true, role: true } })
    : [];

  return (
    <header className="border-b" style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Reservations
        </Link>
        {user && <Nav />}
        <div className="ml-auto">
          {user && <UserSwitcher users={users} currentId={user.id} />}
        </div>
      </div>
    </header>
  );
}
