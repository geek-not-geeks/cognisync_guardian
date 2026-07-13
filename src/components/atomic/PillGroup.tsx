/**
 * 3D pill toggle group. Bounded selector for enum-like fields
 * (e.g. effort size, difficulty). Fully controlled.
 */
interface PillGroupProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}

export function PillGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: PillGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt)}
            className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
              active
                ? "bg-accent-mint text-slate-deep shadow-3d-pressed"
                : "bg-surface text-text-secondary shadow-3d-base hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
