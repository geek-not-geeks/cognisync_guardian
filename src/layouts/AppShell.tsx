import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, PlusCircle, Activity, User, Users, type LucideIcon } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useGovernorLockout } from "@/hooks/useGovernorLockout";
import { NetworkBanner } from "@/components/ui/NetworkBanner";


type NavPath = "/" | "/add-task" | "/status" | "/profile" | "/parent-view";

interface NavItem {
  to: NavPath;
  label: string;
  icon: LucideIcon;
}

const STUDENT_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/add-task", label: "Add Task", icon: PlusCircle },
  { to: "/status", label: "Status", icon: Activity },
  { to: "/profile", label: "Profile", icon: User },
];

const PARENT_NAV: NavItem[] = [
  { to: "/parent-view", label: "Parent", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
];

const PARENT_ALLOWED: NavPath[] = ["/parent-view", "/profile"];
const STUDENT_BLOCKED: NavPath[] = ["/parent-view"];

export function AppShell({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { isLocked } = useGovernorLockout();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!session && location.pathname !== "/auth") {
      void navigate({ to: "/auth" });
    }
  }, [loading, session, location.pathname, navigate]);

  useEffect(() => {
    if (!session || roleLoading || !role) return;
    const path = location.pathname as NavPath;
    if (role === "parent" && !PARENT_ALLOWED.includes(path)) {
      void navigate({ to: "/parent-view" });
    } else if (role === "student" && STUDENT_BLOCKED.includes(path)) {
      void navigate({ to: "/" });
    }
  }, [role, roleLoading, session, location.pathname, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-text-secondary">
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  const navItems = role === "parent" ? PARENT_NAV : STUDENT_NAV;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <OfflineBanner />
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-6">{children}</main>
      <BottomNav items={navItems} lockAddTask={role !== "parent" && isLocked} />
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

function BottomNav({ items, lockAddTask }: { items: NavItem[]; lockAddTask: boolean }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2">
        {items.map(({ to, label, icon: Icon }) => {
          const disabled = lockAddTask && to === "/add-task";
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-label={label}
                aria-disabled={disabled}
                onClick={(e) => {
                  if (disabled) e.preventDefault();
                }}
                className={`group flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium text-text-secondary transition-colors data-[status=active]:text-accent-mint ${
                  disabled ? "pointer-events-none opacity-40" : ""
                }`}
                activeProps={{ className: "text-accent-mint" }}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
