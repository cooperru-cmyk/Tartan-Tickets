import { jsonError, readJson } from "../../../lib/http.js";
import { ticketStore } from "../../../lib/tickets.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const order = ticketStore.createOrder(body);
    return Response.json(order, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
