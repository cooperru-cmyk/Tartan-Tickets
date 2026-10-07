import { jsonError, readJson } from "../../../../../lib/http.js";
import { ticketStore } from "../../../../../lib/tickets.js";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const { orderId } = await params;
    const body = await readJson(request);
    const order = ticketStore.completeSimulatedPayment(orderId, body.studentName);
    return order
      ? Response.json(order)
      : Response.json({ error: "Order not found." }, { status: 404 });
  } catch (error) {
    return jsonError(error);
  }
}
