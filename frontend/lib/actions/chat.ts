"use server";

import { ApiError } from "@/lib/api/client";
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

/**
 * `apiFetch` (lib/api/client.ts) hardcodes `Content-Type: application/json`,
 * so it cannot carry a file — this does its own multipart request straight to
 * the shared `POST /uploads/image` endpoint instead (same one item/giveaway
 * images already go through). Kept server-side like every other backend call
 * in this app; the client only ever hands this action a `FormData`.
 */
export async function uploadChatImage(formData: FormData): Promise<string> {
  await requireSession();

  const API_URL = process.env.API_URL ?? "http://localhost:3000";
  let res: Response;
  try {
    res = await fetch(`${API_URL}/uploads/image`, {
      method: "POST",
      headers: await authHeader(),
      body: formData,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, `Could not reach the server at ${API_URL}`);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    const message =
      body && typeof body === "object" && "message" in body && body.message
        ? String(body.message)
        : `Upload failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return (body.data as { url: string }).url;
}
