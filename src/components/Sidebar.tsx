import Link from "next/link";
import { Logo } from "./Logo";
import { Nav } from "./Nav";
import { UserSwitcher } from "./UserSwitcher";

type U = { id: string; name: string; role: "ADMIN" | "MEMBER" };

export function Sidebar({ user, users }: { user: U; users: U[] }) {
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <aside
      className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-8 lg:px-4 lg:py-6"
      style={{
        background: "linear-gradient(180deg, #1a1d54 0%, #12153d 100%)",
        color: "#c9cffa",
      }}
    >
      <Link href="/" className="px-2" aria-label="Reserve Hub home">
        <Logo size={38} tone="light" />
      </Link>

      <Nav />

      <div className="lg:mt-auto lg:border-t lg:pt-5" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        <div className="mb-3 flex items-center gap-3 px-2">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #7c6cff, #3b30d1)", boxShadow: "0 0 0 2px rgba(255,255,255,0.25)" }}
            aria-hidden
          >
            {initials}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold text-white">{user.name}</span>
            <span className="block text-xs" style={{ color: "#9aa3e6" }}>
              {user.role === "ADMIN" ? "Administrator" : "Member"}
            </span>
          </span>
        </div>
        <UserSwitcher users={users} currentId={user.id} />
      </div>
    </aside>
  );
}
