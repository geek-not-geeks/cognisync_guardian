import { z } from "zod";

/**
 * Sign-in schema: lenient — accepts legacy passwords that predate NIST rules.
 * We only enforce a valid email + non-empty password to avoid locking out
 * users who registered under earlier complexity requirements.
 */
export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

/**
 * Sign-up schema: strict NIST-aligned complexity.
 */
export const signUpSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[0-9]/, "Password must include a number.")
    .regex(/[^A-Za-z0-9]/, "Password must include a special character."),
});

/** Back-compat alias for existing imports. */
export const authSchema = signInSchema;

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

interface SupabaseLikeError {
  message?: unknown;
  code?: unknown;
  status?: unknown;
  error_description?: unknown;
  name?: unknown;
}

const CODE_MAP: Record<string, string> = {
  invalid_credentials:
    "Incorrect email or password. Please verify your credentials or use 'Forgot Password'.",
  "400":
    "Incorrect email or password. Please verify your credentials or use 'Forgot Password'.",
  user_already_exists:
    "An account is already registered with this email address. Please sign in.",
  email_exists:
    "An account is already registered with this email address. Please sign in.",
  "422":
    "An account is already registered with this email address. Please sign in.",
  email_not_confirmed:
    "Your email address is not verified. Please check your inbox for the verification link.",
  over_email_send_rate_limit:
    "Too many security requests. For your protection, please wait 60 seconds before retrying.",
  "429":
    "Too many security requests. For your protection, please wait 60 seconds before retrying.",
  weak_password: "Your password does not meet enterprise security requirements.",
  signup_disabled: "New sign-ups are currently disabled.",
};

const MESSAGE_MAP: { pattern: RegExp; text: string }[] = [
  { pattern: /already registered|already exists/i, text: CODE_MAP.user_already_exists },
  { pattern: /invalid login credentials/i, text: CODE_MAP.invalid_credentials },
  { pattern: /email not confirmed/i, text: CODE_MAP.email_not_confirmed },
  { pattern: /rate limit/i, text: CODE_MAP.over_email_send_rate_limit },
  { pattern: /weak.?password/i, text: CODE_MAP.weak_password },
];

const FALLBACK = "Authentication failed. Please check your network connection.";

/**
 * Normalize an unknown error into a clean, human-readable string.
 * Guaranteed to never throw and never return "{}" or an empty string.
 */
export function formatAuthError(err: unknown): string {
  try {
    if (!err) return FALLBACK;

    if (typeof err === "string") {
      const t = err.trim();
      return t.length > 0 && t !== "{}" ? mapMessage(t) : FALLBACK;
    }

    if (err instanceof Error) {
      const codeCandidate = (err as unknown as { code?: unknown }).code;
      if (typeof codeCandidate === "string" && CODE_MAP[codeCandidate]) {
        return CODE_MAP[codeCandidate];
      }
      const msg = err.message?.trim();
      if (msg) return mapMessage(msg);
      return FALLBACK;
    }

    if (typeof err === "object") {
      const e = err as SupabaseLikeError;

      const code = typeof e.code === "string" ? e.code : undefined;
      if (code && CODE_MAP[code]) return CODE_MAP[code];

      const status =
        typeof e.status === "number"
          ? String(e.status)
          : typeof e.status === "string"
            ? e.status
            : undefined;
      if (status && CODE_MAP[status]) return CODE_MAP[status];

      const raw =
        (typeof e.message === "string" && e.message) ||
        (typeof e.error_description === "string" && e.error_description) ||
        "";
      const trimmed = raw.trim();
      if (trimmed && trimmed !== "{}") return mapMessage(trimmed);
    }

    return FALLBACK;
  } catch {
    return FALLBACK;
  }
}

function mapMessage(msg: string): string {
  for (const { pattern, text } of MESSAGE_MAP) {
    if (pattern.test(msg)) return text;
  }
  return msg;
}
