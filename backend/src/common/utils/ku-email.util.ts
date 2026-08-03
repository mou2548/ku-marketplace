const KU_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@ku\.(ac\.th|th)$/i;

export function isValidKuEmail(email: string): boolean {
  return KU_EMAIL_REGEX.test(email);
}

export function extractFirstNameFromEmail(email: string): string {
  return email.split('@')[0];
}