"use server";

import { getAccessToken } from "@/lib/api/session";
import {
  createGiveaway as createGiveawayApi,
  drawGiveaway as drawGiveawayApi,
  forfeitTicket as forfeitTicketApi,
  generateTicketQr as generateTicketQrApi,
  getGiveaway,
  getGiveawayMessages as getGiveawayMessagesApi,
  joinGiveaway as joinGiveawayApi,
  scanTicketQr as scanTicketQrApi,
  selectRecipients as selectRecipientsApi,
  sendGiveawayMessage as sendGiveawayMessageApi,
  type CreateGiveawayInput,
} from "@/lib/api/giveaways";
import type { ChatMessage, GiveawayPost, GiveawayTicket } from "@/lib/api/types";

async function requireSession() {
  if (!(await getAccessToken())) throw new Error("Not signed in");
}

export async function createGiveaway(input: CreateGiveawayInput): Promise<GiveawayPost> {
  await requireSession();
  return createGiveawayApi(input);
}

export async function joinGiveaway(giveawayId: number): Promise<GiveawayTicket> {
  await requireSession();
  const giveaway = await getGiveaway(giveawayId);
  return joinGiveawayApi(giveawayId, giveaway);
}

export async function drawGiveaway(giveawayId: number) {
  await requireSession();
  return drawGiveawayApi(giveawayId);
}

export async function selectRecipients(giveawayId: number, receiverIds: number[]) {
  await requireSession();
  return selectRecipientsApi(giveawayId, receiverIds);
}

export async function forfeitTicket(ticketId: number): Promise<void> {
  await requireSession();
  await forfeitTicketApi(ticketId);
}

export async function generateTicketQr(
  giveawayId: number,
  ticketId: number,
): Promise<{ token: string; expiresInSeconds: number }> {
  await requireSession();
  return generateTicketQrApi(giveawayId, ticketId);
}

export async function scanTicketQr(
  giveawayId: number,
  ticketId: number,
  token: string,
): Promise<boolean> {
  await requireSession();
  return scanTicketQrApi(giveawayId, ticketId, token);
}

export async function sendGiveawayMessage(
  giveawayId: number,
  input: { content?: string; image_urls?: string[] },
): Promise<ChatMessage> {
  await requireSession();
  return sendGiveawayMessageApi(giveawayId, input);
}

export async function fetchGiveawayMessages(giveawayId: number): Promise<ChatMessage[]> {
  await requireSession();
  const { messages } = await getGiveawayMessagesApi(giveawayId);
  return messages;
}
