import { createFileRoute, redirect } from "@tanstack/react-router";

// "/dashboard" is a legacy route left over from an earlier iteration; the
// real dashboard now lives at "/". Redirect rather than delete, so any
// bookmarked or hardcoded links (and search-engine-indexed URLs) still land
// somewhere correct instead of 404ing or hitting a dead stub.
export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
