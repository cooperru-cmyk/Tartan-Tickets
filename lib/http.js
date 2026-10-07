import { TicketError } from "./tickets.js";

export function jsonError(error) {
  if (error instanceof TicketError) {
    const statusByCode = {
      EVENT_NOT_FOUND: 404,
      ORDER_NOT_FOUND: 404,
      SOLD_OUT: 409,
      STUDENT_EVENT_LIMIT_EXCEEDED: 409,
      SEAT_LIMIT_EXCEEDED: 400,
      INVALID_SEAT_COUNT: 400,
      INVALID_NAME: 400,
      EVENT_NOT_SOLD_OUT: 409,
      ORDER_NOT_PAYABLE: 409,
      INVALID_SIGNATURE: 400,
      RATE_LIMITED: 429,
    };
    return Response.json(
      {
        error: error.message,
        code: error.code,
        ...(error.canWaitlist ? { canWaitlist: true } : {}),
      },
      { status: statusByCode[error.code] ?? 400 },
    );
  }
  console.error("Unexpected ticket API error:", error);
  return Response.json({ error: "An unexpected error occurred." }, { status: 500 });
}

export async function readJson(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    throw new TicketError("INVALID_REQUEST", "Request body must be valid JSON.");
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new TicketError("INVALID_REQUEST", "Request body must be a JSON object.");
  }
  return body;
}
