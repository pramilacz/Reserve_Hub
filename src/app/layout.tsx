import type { Metadata } from "next";
import "@fontsource-variable/public-sans";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: { default: "Reservations", template: "%s · Reservations" },
  description: "Reserve shared rooms, equipment and vehicles without double-booking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
