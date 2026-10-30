"use client";

import { formatDateTime } from "@/lib/date-format";
import { getCopy } from "@/lib/copy";
import { Calendar, Check, MapPin, Pencil } from "lucide-react";

import { APPOINTMENT_STATUS, type AppointmentStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Surface } from "./surface";
import { viewerActsOnAppointment } from "@/lib/badge-tier";

import { StatusBadge } from "./status-badge";

/**
 * Research trust gap T3: "will they actually show up?"
 *
 * The appointment card is a commitment device, not a note. Both sides see the
 * same time and place, both sides act on it, and a proposed card must not look
 * like an accepted one at a glance — an unanswered commitment is the thing the
 * buyer is anxious about.
 *
 * The map is an iframe embed, which is why it is lazy: an eagerly loaded Google
 * Maps frame in a chat thread would blow the 150 KB route budget on its own.
 */
/**
 * Revised 2026-08-07. This used to invent its own states — proposed, accepted,
 * declined — which meant a real `Appointment_Card` row could never be passed
 * in. The values now come from lib/status.ts, which mirrors the schema:
 * Pending, Confirmed, Rejected.
 */

export interface AppointmentCardProps {
  status: AppointmentStatus;
  /** ISO datetime. */
  scheduledAt: string;
  place: string;
  /** "lat,lng" — feeds the embed. Omit to hide the map. */
  coordinates?: string | null;
  /** Google Maps Embed API key. Without it the map is replaced by a link. */
  mapsApiKey?: string;
  /** True when the viewer is the one who must answer. */
  awaitingViewer?: boolean;
  onAccept?: () => void;
  /**
   * Opens the pre-filled edit form in place of this card so a change can be
   * resent — see room-screen.tsx. Rendered as a pencil icon in the header,
   * and (for the awaiting side on a Pending card) as the row's secondary
   * action instead of a bare reject.
   */
  onEdit?: () => void;
  className?: string;
}

export function AppointmentCard({
  status,
  scheduledAt,
  place,
  coordinates,
  mapsApiKey,
  awaitingViewer = false,
  onAccept,
  onEdit,
  className,
}: AppointmentCardProps) {
  const t = getCopy();
  const when = new Date(scheduledAt);
  const copy = APPOINTMENT_STATUS[status];

  const embedSrc =
    coordinates && mapsApiKey
      ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${encodeURIComponent(coordinates)}&zoom=17`
      : null;

  return (
    <Surface
      as="article"
      shape="card"
      elevation={status === "Pending" ? "floating" : "raised"}
      className={cn(
        "overflow-hidden",
        // A pending card reads as an open question through its act-now
        // badge and its floating elevation; no coloured ring.
        status === "Rejected" && "opacity-70",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h4 className="text-[1.125rem] leading-[1.4] font-semibold">{t("appointment.meetup")}</h4>
        <span className="flex items-center gap-1.5">
          <StatusBadge
            status={copy}
            viewerActs={viewerActsOnAppointment(status, awaitingViewer)}
            size="sm"
          />
          {/* The awaiting side already gets an "Edit" button in the action
              row below — showing the pencil here too would just duplicate
              it, so this is for the other cases: the proposer touching up
              their own still-Pending card, or either side rescheduling a
              Confirmed one. */}
          {onEdit && !(status === "Pending" && awaitingViewer) ? (
            <Button
              variant="ghost"
              size="icon-sm"
              pill
              aria-label={t("appointment.edit")}
              onPress={onEdit}
            >
              <Pencil className="size-3.5" />
            </Button>
          ) : null}
        </span>
      </div>

      <dl className="flex flex-col gap-2.5 p-4">
        <div className="flex items-start gap-2.5">
          <Calendar aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
          <div>
            <dt className="sr-only">{t("appointment.dateAndTime")}</dt>
            <dd>
              <time dateTime={scheduledAt} className="font-medium">
                {formatDateTime(when)}
              </time>
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
          <div>
            <dt className="sr-only">{t("appointment.place")}</dt>
            <dd className="font-medium">{place}</dd>
          </div>
        </div>
      </dl>

      {embedSrc ? (
        <iframe
          title={`Map of ${place}`}
          src={embedSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="aspect-[16/9] w-full border-0"
        />
      ) : coordinates ? (
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(coordinates)}`}
          target="_blank"
          rel="noreferrer"
          className="block px-4 pb-2 text-body-sm font-medium text-ink-brand underline"
        >{t("appointment.openInMaps")}</a>
      ) : null}

      {status === "Pending" && awaitingViewer ? (
        /* Two w-full buttons in a row gave each 144px inside a 296px card at
           360px, and "Suggest another time" plus its icon needs about 200px.
           button.tsx sets whitespace-nowrap so it could not wrap, and the
           Surface is overflow-hidden so the label was cut off rather than
           scrolled. Stacked below sm:, and the label is shorter. */
        <div className="flex flex-col-reverse gap-2 p-4 pt-3 sm:flex-row">
          <Button variant="secondary" block onPress={onEdit}>
            <Pencil className="size-4" />{t("appointment.edit")}</Button>
          <Button variant="primary" block onPress={onAccept}>
            <Check className="size-4" />{t("appointment.accept")}</Button>
        </div>
      ) : null}
    </Surface>
  );
}
