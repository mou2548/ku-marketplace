/**
 * Identity rules — proposal §1.
 *
 * §1 calls this the trust anchor of the whole platform: every transaction,
 * report, and sanction traces back to a verified institutional email, and that
 * is the security model. There is no escrow and no payment control (§8.1), so
 * these checks are what keep bad actors accountable.
 */

/** §1.1 — the only two domains that may register. */
export const ALLOWED_EMAIL_DOMAINS = ["ku.th", "ku.ac.th"] as const;

/**
 * How an email is sent to the API. Autofill adds spaces around it (audit F03).
 * Case is left alone: the API stores and compares addresses as typed, so
 * lowercasing here would lock out any account registered with capitals.
 */
export function normalizeEmail(email: string): string {
  return email.trim();
}

export function isKuEmail(email: string): boolean {
  const normalized = normalizeEmail(email).toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.some((domain) => normalized.endsWith(`@${domain}`));
}

/**
 * §1.3 — the local part of the institutional address becomes the English
 * first name, stored once and locked. It is the anti-impersonation anchor:
 * it can always be traced back to the university address that produced it.
 * Surname and Thai names stay freely editable.
 */
export function derivedFirstName(email: string): string {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  const namePart = local.split(".")[0] ?? local;
  return namePart ? namePart[0].toUpperCase() + namePart.slice(1) : "";
}

/** §1.4 — 8–64 chars, at least one letter and one digit. No symbol rule. */
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 64,
} as const;

export interface PasswordCheck {
  longEnough: boolean;
  shortEnough: boolean;
  hasLetter: boolean;
  hasDigit: boolean;
}

export function checkPassword(password: string): PasswordCheck {
  return {
    longEnough: password.length >= PASSWORD_RULES.minLength,
    shortEnough: password.length <= PASSWORD_RULES.maxLength,
    hasLetter: /[a-zA-Z]/.test(password),
    hasDigit: /\d/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  return Object.values(checkPassword(password)).every(Boolean);
}

/** §1.2 — the registration code's lifetime. */
export const OTP_TTL_MINUTES = 10;


/**
 * Where a signed-out visitor may be sent back to after signing in (audit F04).
 *
 * Only a same-origin path is accepted: one leading slash followed by anything
 * but a second slash or a backslash, so `//host`, `/\host`, `https://host` and
 * `javascript:` never qualify. Whitespace and control characters are refused
 * too, because a URL parser strips tabs and newlines and `/\t/host` would
 * collapse into `//host`. Non-ASCII is refused rather than encoded here: every
 * caller builds the value from an already-encoded URL. The auth screens and API
 * routes are excluded so a sign-in can never loop back onto itself.
 */
const SAFE_RETURN_TO = /^\/(?![/\\])[\x21-\x5b\x5d-\x7e]*$/;
const RETURN_TO_EXCLUDED = ["/login", "/register", "/verify", "/forgot", "/reset", "/api"];
const RETURN_TO_MAX_LENGTH = 2048;

function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function safeReturnTo(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.length > RETURN_TO_MAX_LENGTH || !SAFE_RETURN_TO.test(value)) return undefined;
  const pathname = value.split(/[?#]/)[0] ?? "";
  if (RETURN_TO_EXCLUDED.some((prefix) => underPrefix(pathname.toLowerCase(), prefix))) {
    return undefined;
  }
  return value;
}

/**
 * The areas whose pages send a signed-out visitor to sign in. Proxy redirects
 * there first, carrying the requested path, so the page's own guard never has
 * to know where it was reached from.
 */
export const SIGNED_IN_PREFIXES = ["/account", "/admin", "/chat", "/history", "/inventory", "/offers"] as const;

export function requiresSignIn(pathname: string): boolean {
  return SIGNED_IN_PREFIXES.some((prefix) => underPrefix(pathname, prefix));
}

/** `/login`, carrying `returnTo` when it is a path sign-in may return to. */
export function loginHref(returnTo?: string | null): string {
  const target = safeReturnTo(returnTo);
  return target ? `/login?returnTo=${encodeURIComponent(target)}` : "/login";
}

/** Set by Proxy on every request: the path and query being rendered. */
export const REQUEST_PATH_HEADER = "x-ku-request-path";
