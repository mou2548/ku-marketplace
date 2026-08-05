const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export type AllocationMethod = "Random" | "Manual" | "FirstCome";

export interface GiveawayImagePayload {
  image_url: string;
  display_order: number;
}

export interface CreateGiveawayPayload {
  item_name: string;
  description: string;
  pickup_location: string;
  allocation_method: AllocationMethod;
  pickup_deadline: string;
  images: GiveawayImagePayload[];
}

export interface GiveawayDetail {
  giveaway_id: string;
  item_name: string;
  description: string;
  pickup_location: string;
  allocation_method: AllocationMethod;
  pickup_deadline: string;
  participant_count: number;
  status: string;
  images: GiveawayImagePayload[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success) {
    throw new Error(body.message || "Giveaway request failed");
  }
  return body.data;
}

export const giveawaysApi = {
  create: (payload: CreateGiveawayPayload) =>
    request<GiveawayDetail>("/giveaways", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  detail: (id: string) => request<GiveawayDetail>(`/giveaways/${id}`),
  join: (id: string) => request<{ ticket_id: string; status: string }>(`/giveaways/${id}/join`, { method: "POST" }),
  draw: (id: string) => request(`/giveaways/${id}/draw`, { method: "POST" }),
  select: (id: string, receiver_ids: number[]) =>
    request(`/giveaways/${id}/select`, { method: "POST", body: JSON.stringify({ receiver_ids }) }),
  recipients: (id: string) => request(`/giveaways/${id}/recipients`),
  forfeit: (recipientId: string) =>
    request(`/giveaways/recipients/${recipientId}/forfeit`, { method: "POST", body: JSON.stringify({ confirm: true }) }),
  generateQr: (id: string, ticketId: string) =>
    request(`/giveaways/${id}/tickets/${ticketId}/qr/generate`, { method: "POST" }),
  scanQr: (id: string, ticketId: string, token: string) =>
    request(`/giveaways/${id}/tickets/${ticketId}/qr/scan`, { method: "POST", body: JSON.stringify({ token }) }),
};
