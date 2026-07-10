import type { ReactNode } from "react";

export function PlaceholderPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">CogniSync</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </header>
      <div className="rounded-[32px] bg-[#1E293B] p-6 shadow-3d-base">
        {children ?? (
          <p className="text-sm text-text-secondary">
            This screen is a placeholder. Content will be built in a later phase.
          </p>
        )}
      </div>
    </section>
  );
}
