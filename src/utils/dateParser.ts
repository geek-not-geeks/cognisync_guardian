import * as chrono from "chrono-node";

export function parseNaturalDate(
  input: string,
  referenceDate: Date = new Date(),
): { date: Date | null; isoString: string | null; formattedLabel: string | null } {
  if (!input || !input.trim()) {
    return { date: null, isoString: null, formattedLabel: null };
  }

  const parsedDate = chrono.parseDate(input.trim(), referenceDate, {
    forwardDate: true,
  });

  if (!parsedDate) {
    return { date: null, isoString: null, formattedLabel: null };
  }

  const formattedLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(parsedDate);

  return {
    date: parsedDate,
    isoString: parsedDate.toISOString(),
    formattedLabel: `📅 ${formattedLabel}`,
  };
}

/** Security Gatekeeper: Strip XSS tags and limit string length. */
export function sanitizeTaskTitle(raw: string): string {
  return raw.replace(/<[^>]*>?/gm, "").trim().slice(0, 250);
}
