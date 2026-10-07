import assert from "node:assert/strict";
import test from "node:test";
import { createTicketStore } from "../lib/tickets.js";

const minute = 60_000;

function setup(options = {}) {
  let now = 1_800_000_000_000;
  const store = createTicketStore({
    clock: () => now,
    events: [
      {
        id: "event-1",
        name: "Robotics Club Showcase",
        priceInCents: 1250,
        capacity: 8,
        ...(options.event ?? {}),
      },
    ],
    ...options.store,
  });

  return {
    store,
    advance: (milliseconds) => {
      now += milliseconds;
    },
  };
}

test("test_someone_else_cannot_view_my_order()", () => {
  const { store } = setup();
  const order = store.createOrder({
    eventId: "event-1",
    studentName: "Alex",
    seats: 2,
  });

  assert.equal(store.getOrder(order.id, "Morgan"), null);
  assert.equal(store.getOrder(order.id, "Alex").id, order.id);
});

test("test_the_server_ignores_a_price_sent_by_the_browser()", () => {
  const { store } = setup();
  const order = store.createOrder({
    eventId: "event-1",
    studentName: "Alex",
    seats: 2,
    priceInCents: 1,
  });

  assert.equal(order.totalInCents, 2500);
  assert.equal(order.unitPriceInCents, 1250);
});

test("test_an_unsigned_webhook_cannot_mark_an_order_paid()", () => {
  const { store } = setup();
  const order = store.createOrder({
    eventId: "event-1",
    studentName: "Alex",
    seats: 1,
  });

  assert.throws(
    () =>
      store.processWebhook({
        orderId: order.id,
        signature: "",
      }),
    { code: "INVALID_SIGNATURE" },
  );
  assert.equal(store.getOrder(order.id, "Alex").status, "pending");
});

test("test_a_fifth_seat_is_rejected()", () => {
  const { store } = setup();

  assert.throws(
    () =>
      store.createOrder({
        eventId: "event-1",
        studentName: "Alex",
        seats: 5,
      }),
    { code: "SEAT_LIMIT_EXCEEDED" },
  );
});

test("a student cannot exceed four seats across separate orders", () => {
  const { store } = setup();
  store.createOrder({ eventId: "event-1", studentName: "Alex", seats: 3 });

  assert.throws(
    () =>
      store.createOrder({
        eventId: "event-1",
        studentName: "Alex",
        seats: 2,
      }),
    { code: "STUDENT_EVENT_LIMIT_EXCEEDED" },
  );
});

test("a sold-out event directs students to the waitlist", () => {
  const { store } = setup({ event: { capacity: 1 } });
  store.createOrder({ eventId: "event-1", studentName: "Alex", seats: 1 });

  assert.throws(
    () =>
      store.createOrder({
        eventId: "event-1",
        studentName: "Morgan",
        seats: 1,
      }),
    { code: "SOLD_OUT", canWaitlist: true },
  );
  assert.equal(
    store.joinWaitlist({ eventId: "event-1", studentName: "Morgan" }).status,
    "waitlisted",
  );
});

test("checkout holds seats for ten minutes and releases expired holds", () => {
  const { store, advance } = setup({ event: { capacity: 2 } });
  const order = store.createOrder({
    eventId: "event-1",
    studentName: "Alex",
    seats: 2,
  });

  assert.equal(order.holdExpiresAt, 1_800_000_600_000);
  advance(10 * minute);

  const nextOrder = store.createOrder({
    eventId: "event-1",
    studentName: "Morgan",
    seats: 2,
  });
  assert.equal(nextOrder.seats, 2);
  assert.equal(store.getOrder(order.id, "Alex").status, "expired");
});

test("the eleventh checkout attempt in a minute is rate limited", () => {
  const { store } = setup();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    assert.throws(
      () =>
        store.createOrder({
        eventId: "missing-event",
        studentName: "Alex",
        seats: 1,
        }),
      { code: "EVENT_NOT_FOUND" },
    );
  }

  assert.throws(
    () =>
      store.createOrder({
        eventId: "missing-event",
        studentName: "Alex",
        seats: 1,
      }),
    { code: "RATE_LIMITED" },
  );
});
