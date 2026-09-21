"use server";

import { apiFetch } from "@/lib/api/client";
import {
  createAppointment as createAppointmentApi,
  getAppointmentCards as getAppointmentCardsApi,
  getChatHistory as getChatHistoryApi,
  respondAppointment as respondAppointmentApi,
  sendMessage as sendMessageApi,
} from "@/lib/api/chat";
import { getRoomSummaries } from "@/lib/api/rooms-query";
import { authHeader, getAccessToken } from "@/lib/api/session";
import type { AppointmentCardData, ChatMessage } from "@/lib/api/types";
import type { RoomSummary } from "@/lib/rooms";

async function requireSession() {
  if (!(await getAccessToken())) throw new Error("Not signed in");
}

/**
 * The inbox, refetched from the client so the room list can float the latest
 * reply to the top without a full navigation. No realtime transport exists
 * (see `lib/use-polling.ts`), so `RoomList` polls this the same way an open
 * room polls its own thread.
 */
export async function fetchRoomSummaries(viewerId: number): Promise<RoomSummary[]> {
  await requireSession();
  return getRoomSummaries(viewerId);
}

export async function fetchChatHistory(transactionId: number): Promise<ChatMessage[]> {
  await requireSession();
  const { messages } = await getChatHistoryApi(transactionId);
  return messages;
}

export async function sendChatMessage(
  transactionId: number,
  input: { content?: string; image_urls?: string[] },
): Promise<ChatMessage> {
  await requireSession();
  return sendMessageApi(transactionId, input);
}

export async function fetchAppointmentCards(
  transactionId: number,
): Promise<AppointmentCardData[]> {
  await requireSession();
  return getAppointmentCardsApi(transactionId);
}

export async function proposeAppointment(
  transactionId: number,
  input: { date: string; time: string; location: string },
): Promise<AppointmentCardData> {
  await requireSession();
  return createAppointmentApi(transactionId, input);
}

export async function respondToAppointment(
  appointmentId: number,
  response: "confirm" | "reject",
): Promise<AppointmentCardData> {
  await requireSession();
  return respondAppointmentApi(appointmentId, response);
}

/** Upload through the shared API client so URL and response handling agree. */
export async function uploadChatImage(formData: FormData): Promise<string> {
  await requireSession();
  const { url } = await apiFetch<{ url: string }>("/uploads/image", {
    method: "POST",
    headers: await authHeader(),
    body: formData,
    cache: "no-store",
  });
  return url;
}
