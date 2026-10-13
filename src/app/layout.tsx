import type { Metadata } from "next";
import "@fontsource-variable/public-sans";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/Sidebar";
import { ToastHost } from "@/components/ToastHost";

export const metadata: Metadata = {
  title: { default: "Reserve Hub", template: "%s · Reserve Hub" },
  description: "Reserve shared rooms, equipment and vehicles without double-booking.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const users = user
    ? await prisma.user.findMany({
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: { id: true, name: true, role: true },
      })
    : [];

  return (
    <html lang="en">
      <body>
        {user ? (
          <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
            <Sidebar user={user} users={users} />
            <main className="min-w-0 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">{children}</main>
          </div>
        ) : (
          <main className="mx-auto w-full max-w-lg px-5 py-14">{children}</main>
        )}
        <ToastHost />
      </body>
    </html>
  );
}
