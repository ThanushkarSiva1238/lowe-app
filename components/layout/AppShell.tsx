import Link from "next/link";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/shipments", label: "Shipments" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/consignees", label: "Consignees" },
  { href: "/reports", label: "Reports" },
  { href: "/backup", label: "Backup" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 print:bg-white">
      <header className="border-b bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-600 text-sm font-semibold text-white">
              LH
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">
                Lowe Holdings
              </p>
              <p className="text-xs text-slate-500">
                Shipment Management Console
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
              Accountor
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 print:px-0 print:py-0">
        <nav className="hidden w-56 shrink-0 flex-col gap-2 md:flex print:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-sky-50 hover:text-sky-700"
            >
              <span>{item.label}</span>
              <span className="text-xs text-slate-400">&gt;</span>
            </Link>
          ))}
        </nav>

        <main className="flex-1">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-6 print:rounded-none print:bg-transparent print:shadow-none print:ring-0 print:p-0 print:md:p-0 print-container-reset">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

