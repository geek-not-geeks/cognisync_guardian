import * as chrono from "chrono-node";

export interface ParsedDateResult {
  date: Date | null;
  isoString: string | null;
  formattedLabel: string | null;
  hasConflict: boolean;
  conflictOptions?: { label: string; isoString: string }[];
  originalText: string;
}

// Layer 1: Strip duplicate consecutive tokens (e.g., "6pm 6pm" -> "6pm", "2026 2027" -> "2026")
export function cleanRawInput(input: string): string {
  return input
    .replace(/\b(\w+)(?:\s+\1\b)+/gi, "$1")
    .replace(/\b(20\d\d)\s+(20\d\d)\b/g, "$1")
    .trim();
}

export function parseDefensiveDate(
  input: string,
  referenceDate: Date = new Date(),
): ParsedDateResult {
  if (!input || !input.trim()) {
    return {
      date: null,
      isoString: null,
      formattedLabel: null,
      hasConflict: false,
      originalText: "",
    };
  }

  // Global scan across the FULL raw input so secondary dates are never dropped.
  const results = chrono.parse(input.trim(), referenceDate, { forwardDate: true });

  if (results.length === 0) {
    return {
      date: null,
      isoString: null,
      formattedLabel: null,
      hasConflict: false,
      originalText: input,
    };
  }

  if (results.length > 1) {
    const options = results.map((r) => {
      const d = r.start.date();
      return {
        label: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(d),
        isoString: d.toISOString(),
      };
    });

    const primaryDate = results[results.length - 1].start.date();
    return {
      date: primaryDate,
      isoString: primaryDate.toISOString(),
      formattedLabel: `⚠️ Conflict: Defaulting to ${options[options.length - 1].label}`,
      hasConflict: true,
      conflictOptions: options,
      originalText: input,
    };
  }

  const parsedDate = results[0].start.date();
  const label = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);

  return {
    date: parsedDate,
    isoString: parsedDate.toISOString(),
    formattedLabel: `📅 ${label}`,
    hasConflict: false,
    originalText: input,
  };
}

// Legacy shim — retained for callers still importing parseNaturalDate.
export function parseNaturalDate(
  input: string,
  referenceDate: Date = new Date(),
): { date: Date | null; isoString: string | null; formattedLabel: string | null } {
  const r = parseDefensiveDate(input, referenceDate);
  return { date: r.date, isoString: r.isoString, formattedLabel: r.formattedLabel };
}

// Layer 3: Aggressive multi-date scrubber — strips ALL temporal tokens from title.
export function extractDateFromTitle(rawTitle: string): {
  cleanTitle: string;
  extractedDeadline: string | null;
} {
  const results = chrono.parse(rawTitle, new Date(), { forwardDate: true });
  if (results.length === 0) {
    return { cleanTitle: rawTitle.trim(), extractedDeadline: null };
  }

  let cleanTitle = rawTitle;
  results.forEach((match) => {
    cleanTitle = cleanTitle.replace(match.text, " ");
  });
  cleanTitle = cleanTitle
    .replace(
      /\b(finish by|complete before|submit on|submit by|work until|due on|due by|due|by|at|on|for)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, "")
    .trim();

  return {
    cleanTitle: cleanTitle || rawTitle.trim(),
    extractedDeadline: results[0].text,
  };
}

/** Security Gatekeeper: Strip XSS tags and limit string length. */
export function sanitizeTaskTitle(raw: string): string {
  return raw.replace(/<[^>]*>?/gm, "").trim().slice(0, 250);
}
