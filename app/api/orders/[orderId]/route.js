import { jsonError, readJson } from "../../../../lib/http.js";
import { ticketStore } from "../../../../lib/tickets.js";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const { orderId } = await params;
    const studentName = new URL(request.url).searchParams.get("studentName");
    const order = ticketStore.getOrder(orderId, studentName);
    return order
      ? Response.json(order)
      : Response.json({ error: "Order not found." }, { status: 404 });
  } catch (error) {
    return jsonError(error);
  }
}
