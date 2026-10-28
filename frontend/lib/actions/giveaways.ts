"use server";

import { runAction, type ActionResult } from "@/lib/action-result";
import { getAccessToken } from "@/lib/api/session";
import {
  closeGiveawayRegistration as closeGiveawayRegistrationApi,
  confirmTicketQr as confirmTicketQrApi,
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

export async function createGiveaway(input: CreateGiveawayInput): Promise<ActionResult<GiveawayPost>> {
  return runAction(async () => {
    await requireSession();
    return createGiveawayApi(input);
  });
}

export async function joinGiveaway(giveawayId: number): Promise<ActionResult<GiveawayTicket>> {
  return runAction(async () => {
    await requireSession();
    const giveaway = await getGiveaway(giveawayId);
    return joinGiveawayApi(giveawayId, giveaway);
  });
}

export async function closeGiveawayRegistration(giveawayId: number): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireSession();
    await closeGiveawayRegistrationApi(giveawayId);
  });
}

export async function drawGiveaway(giveawayId: number) {
  return runAction(async () => {
    await requireSession();
    return drawGiveawayApi(giveawayId);
  });
}

export async function selectRecipients(giveawayId: number, receiverIds: number[]) {
  return runAction(async () => {
    await requireSession();
    return selectRecipientsApi(giveawayId, receiverIds);
  });
}

export async function forfeitTicket(ticketId: number): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireSession();
    await forfeitTicketApi(ticketId);
  });
}

export async function generateTicketQr(
  giveawayId: number,
  ticketId: number,
): Promise<ActionResult<{ token: string; expiresInSeconds: number }>> {
  return runAction(async () => {
    await requireSession();
    return generateTicketQrApi(giveawayId, ticketId);
  });
}

export async function scanTicketQr(
  giveawayId: number,
  ticketId: number,
  token: string,
): Promise<ActionResult<boolean>> {
  return runAction(async () => {
    await requireSession();
    return scanTicketQrApi(giveawayId, ticketId, token);
  });
}

export async function confirmTicketQr(
  giveawayId: number,
  ticketId: number,
  token: string,
): Promise<ActionResult<boolean>> {
  return runAction(async () => {
    await requireSession();
    return confirmTicketQrApi(giveawayId, ticketId, token);
  });
}

export async function sendGiveawayMessage(
  giveawayId: number,
  input: { content?: string; image_urls?: string[] },
): Promise<ActionResult<ChatMessage>> {
  return runAction(async () => {
    await requireSession();
    return sendGiveawayMessageApi(giveawayId, input);
  });
}

export async function fetchGiveawayMessages(giveawayId: number): Promise<ActionResult<ChatMessage[]>> {
  return runAction(async () => {
    await requireSession();
    const { messages } = await getGiveawayMessagesApi(giveawayId);
    return messages;
  });
}
