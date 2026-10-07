import { jsonError } from "../../../lib/http.js";
import { ticketStore } from "../../../lib/tickets.js";

export const runtime = "nodejs";

export function GET() {
  try {
    return Response.json(ticketStore.listEvents());
  } catch (error) {
    return jsonError(error);
  }
}
