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

