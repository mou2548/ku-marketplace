/**
 * The name other students see. The Thai name is the part a user can edit on
 * their profile, so it leads; the English name from the university record is
 * the fallback when no Thai name is set.
 */
export function displayName(user: {
  firstNameEn: string;
  lastNameEn: string;
  firstNameTh?: string | null;
  lastNameTh?: string | null;
}): string {
  const thai = [user.firstNameTh, user.lastNameTh]
    .filter((part) => part?.trim())
    .join(' ')
    .trim();
  if (thai) return thai;
  return [user.firstNameEn, user.lastNameEn].filter(Boolean).join(' ').trim();
}
