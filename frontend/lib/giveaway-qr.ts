/**
 * Wire format for a giveaway ticket's QR — `{ g, t, token }`, not the bare
 * token — because `qr/scan` needs the giveaway id and ticket id as path
 * params (`giveaways.controller.ts`), and the scanner only ever gets back
 * whatever string `QrTicket` encoded (`components/kit/qr-ticket.tsx`,
 * `qr-scanner.tsx`). This is the frontend's own choice, not a backend
 * contract — see `lib/api/giveaways.ts`.
 *
 * Split out of `lib/api/giveaways.ts` because that module imports
 * `lib/api/session.ts` (`next/headers`, server-only), and `decodeTicketQr`
 * is called from `manage-giveaway.tsx`, a Client Component — pulling the
 * server-only module into the client bundle fails the build.
 */

export function encodeTicketQr(giveawayId: number, ticketId: number, token: string): string {
  return JSON.stringify({ g: giveawayId, t: ticketId, token });
}

export function decodeTicketQr(
  raw: string,
): { giveawayId: number; ticketId: number; token: string } | null {
  try {
    const parsed = JSON.parse(raw) as { g?: unknown; t?: unknown; token?: unknown };
    if (
      typeof parsed.g === "number" &&
      typeof parsed.t === "number" &&
      typeof parsed.token === "string"
    ) {
      return { giveawayId: parsed.g, ticketId: parsed.t, token: parsed.token };
    }
    return null;
  } catch {
    return null;
  }
}
