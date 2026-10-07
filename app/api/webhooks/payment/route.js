import { jsonError, readJson } from "../../../../lib/http.js";
import { ticketStore } from "../../../../lib/tickets.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const order = ticketStore.processWebhook({
      orderId: body.orderId,
      payload: body.orderId,
      signature: request.headers.get("x-payment-signature"),
    });
    return Response.json(order);
  } catch (error) {
    return jsonError(error);
  }
}
