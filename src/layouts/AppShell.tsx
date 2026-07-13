import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, PlusCircle, Activity, User, WifiOff, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { pendingCount, subscribeQueue } from "@/lib/offlineQueue";

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
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!session && location.pathname !== "/auth") {
      void navigate({ to: "/auth" });
    }
  }, [loading, session, location.pathname, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-text-secondary">
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <OfflineBanner />
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}

function OfflineBanner() {
  const [count, setCount] = useState(pendingCount());
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const unsub = subscribeQueue((entries) => setCount(entries.length));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      unsub();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online && count === 0) return null;

  return (
    <div className="mx-auto mt-3 flex max-w-2xl items-center gap-2 rounded-full bg-surface px-4 py-2 text-xs text-warning-amber shadow-3d-base">
      <WifiOff className="h-4 w-4" />
      {online
        ? `Syncing ${count} pending change${count === 1 ? "" : "s"}…`
        : `Working offline — ${count} change${count === 1 ? "" : "s"} queued`}
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
