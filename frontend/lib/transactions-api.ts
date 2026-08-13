import { getDevToken } from "@/lib/dev-token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

// These routes return the raw Prisma row (camelCase, no {success,message,data}
// wrapper) — unlike giveaways-api.ts, there's no serialization layer in front
// of them yet.
export interface ChatMessage {
  messageId: number;
  roomId: number;
  senderId: number;
  content: string | null;
  imageUrls: string[] | null;
  createdAt: string;
}

export interface AppointmentCard {
  appointmentId: number;
  transactionId: number;
  proposedBy: number;
  date: string;
  time: string;
  location: string;
  status: string | null;
  createdAt: string;
}

interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getDevToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(", ")
      : errorBody?.message;
    throw new Error(message || "Transaction request failed");
  }

  return body as T;
}

export const transactionsApi = {
  getMessages: (transactionId: number) =>
    request<ChatMessage[]>(`/transactions/${transactionId}/message`),
  sendMessage: (transactionId: number, payload: { content?: string; image_urls?: string[] }) =>
    request<ChatMessage>(`/transactions/${transactionId}/message`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createAppointment: (
    transactionId: number,
    payload: { date: string; time: string; location: string }
  ) =>
    request<AppointmentCard>(`/transactions/${transactionId}/appointment-cards`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  respondToAppointment: (appointmentId: number, response: "confirm" | "reject") =>
    request<AppointmentCard>(`/appointment-cards/${appointmentId}/respond`, {
      method: "POST",
      body: JSON.stringify({ response }),
    }),
};
