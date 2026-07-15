import { z } from "zod";

/**
 * Auth input contract: RFC email + enterprise password rules
 * (min 8 chars, ≥1 digit, ≥1 special char).
 */
export const authSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/\d/, "Password must include at least one number.")
    .regex(/[^A-Za-z0-9]/, "Password must include at least one special character."),
});

export type AuthInput = z.infer<typeof authSchema>;

interface SupabaseLikeError {
  message?: unknown;
  code?: unknown;
  error_description?: unknown;
  name?: unknown;
}

const CODE_MAP: Record<string, string> = {
  user_already_exists: "An account with this email already exists. Try signing in.",
  email_exists: "An account with this email already exists. Try signing in.",
  over_email_send_rate_limit:
    "Too many emails sent. Please wait a minute before trying again.",
  invalid_credentials: "Email or password is incorrect.",
  email_not_confirmed: "Please confirm your email address before signing in.",
  weak_password: "Password is too weak — use 8+ characters with a number and symbol.",
  signup_disabled: "New sign-ups are currently disabled.",
};

const MESSAGE_MAP: { pattern: RegExp; text: string }[] = [
  { pattern: /already registered|already exists/i, text: CODE_MAP.user_already_exists },
  { pattern: /invalid login credentials/i, text: CODE_MAP.invalid_credentials },
  { pattern: /email not confirmed/i, text: CODE_MAP.email_not_confirmed },
  { pattern: /rate limit/i, text: CODE_MAP.over_email_send_rate_limit },
];

/**
 * Normalize an unknown error into a clean, human-readable string.
 * Never returns an empty object stringified as "{}" or an empty message.
 */
export function formatAuthError(err: unknown): string {
  if (!err) return "Authentication failed. Please try again.";

  if (typeof err === "string") return err.trim() || "Authentication failed.";

  if (err instanceof Error && err.message.trim()) {
    return mapMessage(err.message);
  }

  if (typeof err === "object") {
    const e = err as SupabaseLikeError;
    const code = typeof e.code === "string" ? e.code : undefined;
    if (code && CODE_MAP[code]) return CODE_MAP[code];

    const raw =
      (typeof e.message === "string" && e.message) ||
      (typeof e.error_description === "string" && e.error_description) ||
      "";
    if (raw.trim()) return mapMessage(raw);
  }

  return "Authentication failed. Please try again.";
}

function mapMessage(msg: string): string {
  for (const { pattern, text } of MESSAGE_MAP) {
    if (pattern.test(msg)) return text;
  }
  return msg.trim();
}
