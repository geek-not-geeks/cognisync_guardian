import { Link } from "@tanstack/react-router";
import { Home, PlusCircle, Activity, User, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  to: "/" | "/add-task" | "/status" | "/profile";
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/add-task", label: "Add Task", icon: PlusCircle },
  { to: "/status", label: "Status", icon: Activity },
  { to: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              aria-label={label}
              className="group flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium text-text-secondary transition-colors data-[status=active]:text-accent-mint"
              activeProps={{ className: "text-accent-mint" }}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
