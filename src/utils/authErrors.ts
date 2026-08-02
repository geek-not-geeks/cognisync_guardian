/**
 * Enterprise Auth Error Boundary
 * Maps raw Supabase auth errors into human-readable, non-leaky copy.
 */
export function mapAuthError(error: unknown): string {
  const e = error as { message?: unknown; code?: unknown } | null;
  const msg =
    (typeof e?.message === "string" ? e.message : "") +
    " " +
    (typeof e?.code === "string" ? e.code : "");

  if (msg.includes("weak_password") || msg.includes("Password should be"))
    return "Your password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one symbol.";
  if (msg.includes("already registered") || msg.includes("User already exists") || msg.includes("user_already_exists") || msg.includes("email_exists"))
    return "An account with this email already exists. Please sign in.";
  if (msg.includes("rate_limit"))
    return "Too many requests. Please wait a moment before trying again.";
  if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials"))
    return "Incorrect email or password. Please try again.";
  if (msg.includes("email_not_confirmed") || msg.includes("Email not confirmed"))
    return "Your email address is not verified. Please check your inbox for the verification link.";

  return "An unexpected authentication error occurred. Please refresh and try again.";
}

/** Generate YYYY-MM-DD in local time, immune to UTC drift. */
export function localDateString(d: Date = new Date()): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}
