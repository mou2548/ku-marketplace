"use server";

import { apiFetch } from "@/lib/api/client";
import {
  createAppointment as createAppointmentApi,
  getAppointmentCards as getAppointmentCardsApi,
  getChatHistory as getChatHistoryApi,
  respondAppointment as respondAppointmentApi,
  sendMessage as sendMessageApi,
} from "@/lib/api/chat";
import { authHeader, getAccessToken } from "@/lib/api/session";
import type { AppointmentCardData, ChatMessage } from "@/lib/api/types";

async function requireSession() {
  if (!(await getAccessToken())) throw new Error("Not signed in");
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
