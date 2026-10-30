/**
 * The giveaway owner's "people have registered" notification: a title that
 * carries the count, and a body that names who.
 *
 * The count is in the title on purpose. A notification's key is built from its
 * title and date (lib/notification-seen.ts), so another registration changes
 * the title, makes a new key, and puts the dot back on the bell.
 */

/** How many names to spell out before "and N more". */
const NAMES_SHOWN = 3;

export function registrationTitle(count: number, itemName: string): string {
  return `${count} ${count === 1 ? "person" : "people"} registered: ${itemName}`;
}

/**
 * Same idea for "people got a place": the count is in the title. Counted over
 * everyone ever given a place, not only those still waiting, so the title
 * changes when a new place is given and not when someone collects, forfeits or
 * lets the window pass.
 */
export function grantTitle(count: number, itemName: string): string {
  return `${count} ${count === 1 ? "person" : "people"} got a place: ${itemName}`;
}

/** The names line for either notice: up to three, then "and N more". */
export function registrationBody(names: readonly string[]): string {
  const shown = names.slice(0, NAMES_SHOWN);
  const rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} and ${rest} more.`;
  if (shown.length <= 1) return shown.length ? `${shown[0]}.` : "";
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}.`;
}
