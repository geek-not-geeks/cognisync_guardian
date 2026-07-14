import { ShieldAlert, Sparkles, Moon, ClipboardCheck } from "lucide-react";

const MAINTENANCE_SLOTS = [
  { icon: ClipboardCheck, label: "10-Min Desk Organization" },
  { icon: Sparkles, label: "20-Min Light Review" },
  { icon: Moon, label: "Mandatory Sleep Hygiene Window" },
];

export function GovernorLockoutPanel() {
  return (
    <div className="rounded-3xl border-2 border-destructive/70 bg-surface p-6 shadow-3d-base">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 shadow-3d-pressed">
          <ShieldAlert className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-destructive">
            Governor Lockout Active
          </p>
          <h3 className="text-base font-semibold text-foreground">
            Recovery pacing enforced
          </h3>
        </div>
      </div>
      <p className="mb-4 text-sm text-text-secondary">
        Three consecutive drained calibrations detected. Heavy scheduling is
        paused. Focus on low-drain maintenance today.
      </p>
      <ul className="space-y-2">
        {MAINTENANCE_SLOTS.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-3d-base"
          >
            <Icon className="h-4 w-4 text-accent-mint" />
            <span className="text-sm font-medium text-foreground">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
