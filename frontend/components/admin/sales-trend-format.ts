/** Date formats shared by the sales trend plot and its table. */

export const DAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export const DAY_LONG = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Points are Bangkok calendar days ("2026-10-05"); read them as plain dates. */
export const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
