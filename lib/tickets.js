import { createHmac, timingSafeEqual } from "node:crypto";

const HOLD_DURATION_MS = 10 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;
const MAX_SEATS_PER_ORDER = 4;

export class TicketError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TicketError";
    this.code = code;
    Object.assign(this, details);
  }
}

function normalizeName(name) {
  return typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
}

function nameKey(name) {
  return normalizeName(name).toLocaleLowerCase("en-US");
}

function publicOrder(order) {
  const { studentKey, ...visibleOrder } = order;
  void studentKey;
  return { ...visibleOrder };
}

export function createTicketStore({
  clock = Date.now,
  events = [
    {
      id: "robotics-showcase",
      name: "Robotics Club Showcase",
      description:
        "Meet the makers, see the robots in action, and support CMU Robotics Club.",
      date: "Friday, October 30, 2026",
      time: "6:30 PM",
      location: "Rangos Ballroom, Cohon University Center",
      priceInCents: 1250,
      capacity: 60,
    },
  ],
  webhookSecret = process.env.WEBHOOK_SECRET ?? "",
} = {}) {
  const eventRecords = new Map(events.map((event) => [event.id, { ...event }]));
  const orders = new Map();
  const waitlist = new Map();
  const attempts = new Map();
  let nextId = 1;

  function cleanExpiredHolds(eventId) {
    const now = clock();
    for (const order of orders.values()) {
      if (
        order.eventId === eventId &&
        order.status === "pending" &&
        order.holdExpiresAt <= now
      ) {
        order.status = "expired";
      }
    }
  }

  function recordCheckoutAttempt(studentName) {
    const key = nameKey(studentName);
    const now = clock();
    const recent = (attempts.get(key) ?? []).filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
    );
    if (recent.length >= RATE_LIMIT_MAX_ATTEMPTS) {
      attempts.set(key, recent);
      throw new TicketError("RATE_LIMITED", "Too many checkout attempts.");
    }
    recent.push(now);
    attempts.set(key, recent);
  }

  function getReservedSeats(eventId, studentName) {
    const key = nameKey(studentName);
    let reserved = 0;
    for (const order of orders.values()) {
      if (
        order.eventId === eventId &&
        order.studentKey === key &&
        (order.status === "paid" ||
          (order.status === "pending" && order.holdExpiresAt > clock()))
      ) {
        reserved += order.seats;
      }
    }
    return reserved;
  }

  function getRemainingSeats(eventId) {
    const event = eventRecords.get(eventId);
    if (!event) {
      throw new TicketError("EVENT_NOT_FOUND", "Event not found.");
    }
    cleanExpiredHolds(eventId);
    let reserved = 0;
    for (const order of orders.values()) {
      if (
        order.eventId === eventId &&
        (order.status === "paid" ||
          (order.status === "pending" && order.holdExpiresAt > clock()))
      ) {
        reserved += order.seats;
      }
    }
    return Math.max(0, event.capacity - reserved);
  }

  return {
    listEvents() {
      return [...eventRecords.values()].map((event) => ({
        ...event,
        remainingSeats: getRemainingSeats(event.id),
      }));
    },

    getEvent(eventId) {
      const event = eventRecords.get(eventId);
      if (!event) {
        throw new TicketError("EVENT_NOT_FOUND", "Event not found.");
      }
      return { ...event, remainingSeats: getRemainingSeats(eventId) };
    },

    createOrder({ eventId, studentName, seats }) {
      recordCheckoutAttempt(studentName);

      const normalizedName = normalizeName(studentName);
      const event = eventRecords.get(eventId);
      if (!event) {
        throw new TicketError("EVENT_NOT_FOUND", "Event not found.");
      }
      if (!normalizedName) {
        throw new TicketError("INVALID_NAME", "Enter your name to continue.");
      }
      if (!Number.isInteger(seats) || seats < 1) {
        throw new TicketError("INVALID_SEAT_COUNT", "Select at least one ticket.");
      }
      if (seats > MAX_SEATS_PER_ORDER) {
        throw new TicketError(
          "SEAT_LIMIT_EXCEEDED",
          `You can reserve up to ${MAX_SEATS_PER_ORDER} tickets per order.`,
        );
      }
      if (getReservedSeats(eventId, normalizedName) + seats > MAX_SEATS_PER_ORDER) {
        throw new TicketError(
          "STUDENT_EVENT_LIMIT_EXCEEDED",
          `You can reserve up to ${MAX_SEATS_PER_ORDER} tickets for this event.`,
        );
      }

      cleanExpiredHolds(eventId);
      if (getRemainingSeats(eventId) < seats) {
        throw new TicketError("SOLD_OUT", "This event is sold out.", {
          canWaitlist: true,
        });
      }

      const createdAt = clock();
      const order = {
        id: `order-${nextId++}`,
        eventId,
        studentName: normalizedName,
        studentKey: nameKey(normalizedName),
        seats,
        unitPriceInCents: event.priceInCents,
        totalInCents: event.priceInCents * seats,
        status: "pending",
        createdAt,
        holdExpiresAt: createdAt + HOLD_DURATION_MS,
      };
      orders.set(order.id, order);
      return publicOrder(order);
    },

    getOrder(orderId, studentName) {
      const order = orders.get(orderId);
      if (!order || order.studentKey !== nameKey(studentName)) {
        return null;
      }
      if (order.status === "pending" && order.holdExpiresAt <= clock()) {
        order.status = "expired";
      }
      return publicOrder(order);
    },

    completeSimulatedPayment(orderId, studentName) {
      const order = orders.get(orderId);
      if (!order || order.studentKey !== nameKey(studentName)) {
        return null;
      }
      if (order.status === "pending" && order.holdExpiresAt <= clock()) {
        order.status = "expired";
      }
      if (order.status !== "pending") {
        throw new TicketError("ORDER_NOT_PAYABLE", "This order can no longer be paid.");
      }
      order.status = "paid";
      order.paidAt = clock();
      return publicOrder(order);
    },

    joinWaitlist({ eventId, studentName }) {
      const normalizedName = normalizeName(studentName);
      if (!normalizedName) {
        throw new TicketError("INVALID_NAME", "Enter your name to join the waitlist.");
      }
      if (!eventRecords.has(eventId)) {
        throw new TicketError("EVENT_NOT_FOUND", "Event not found.");
      }
      if (getRemainingSeats(eventId) > 0) {
        throw new TicketError(
          "EVENT_NOT_SOLD_OUT",
          "Tickets are still available for this event.",
        );
      }
      const key = `${eventId}:${nameKey(normalizedName)}`;
      const existing = waitlist.get(key);
      if (existing) {
        return { ...existing };
      }
      const entry = {
        id: `waitlist-${nextId++}`,
        eventId,
        studentName: normalizedName,
        status: "waitlisted",
        createdAt: clock(),
      };
      waitlist.set(key, entry);
      return { ...entry };
    },

    processWebhook({ orderId, signature, payload = orderId }) {
      const expected = createHmac("sha256", webhookSecret)
        .update(String(payload))
        .digest();
      let received;
      try {
        received = Buffer.from(signature ?? "", "hex");
      } catch {
        received = Buffer.alloc(0);
      }
      if (
        !webhookSecret ||
        received.length !== expected.length ||
        !timingSafeEqual(received, expected)
      ) {
        throw new TicketError("INVALID_SIGNATURE", "Webhook signature is invalid.");
      }
      const order = orders.get(orderId);
      if (!order) {
        throw new TicketError("ORDER_NOT_FOUND", "Order not found.");
      }
      if (order.status === "pending" && order.holdExpiresAt > clock()) {
        order.status = "paid";
        order.paidAt = clock();
      }
      return publicOrder(order);
    },

    getWaitlist(eventId) {
      return [...waitlist.values()]
        .filter((entry) => entry.eventId === eventId)
        .map((entry) => ({ ...entry }));
    },
  };
}

export const ticketStore = createTicketStore();
