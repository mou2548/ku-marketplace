import type { PrismaService } from '../prisma/prisma.service';

/**
 * `Appointment_Card` records that a proposal was answered but not when, and the
 * chat needs the time to place "Meetup confirmed" among the messages. Answering
 * writes a notification for the proposer with a stable key
 * (`respondToAppointment`), and its `created_at` is that moment — read from
 * there rather than adding a column.
 *
 * A card answered before that notification existed, or whose notification was
 * removed, has no entry; callers send `null` and the frontend places the card
 * right after its proposal.
 */
export const appointmentRespondedKey = (appointmentId: number) =>
  `appointment:${appointmentId}:responded`;

export async function loadAppointmentRespondedAt(
  prisma: Pick<PrismaService, 'notification'>,
  appointments: Array<{ appointmentId: number; proposedBy: number }>,
): Promise<Map<number, Date>> {
  const answered = new Map<number, Date>();
  if (appointments.length === 0) return answered;

  const rows = await prisma.notification.findMany({
    where: {
      eventKey: {
        in: appointments.map((a) => appointmentRespondedKey(a.appointmentId)),
      },
      userId: { in: [...new Set(appointments.map((a) => a.proposedBy))] },
    },
    select: { userId: true, eventKey: true, createdAt: true },
  });
  const byKey = new Map(rows.map((r) => [`${r.userId}|${r.eventKey}`, r]));

  for (const a of appointments) {
    const row = byKey.get(
      `${a.proposedBy}|${appointmentRespondedKey(a.appointmentId)}`,
    );
    if (row?.createdAt) answered.set(a.appointmentId, row.createdAt);
  }
  return answered;
}
