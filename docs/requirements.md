# Tartan Tickets: Requirements Spec

**Problem:** Student clubs need to sell event tickets and collect payment without spreadsheets and Venmo requests. Students buy tickets; club officers manage their own club's events. Payments run through Stripe.

---

## User Stories and Acceptance Criteria (EARS)

### Story 1: Buy tickets
As a student, I want to buy up to 4 tickets so my friends can sit with me.

- WHEN a student submits an order, THE system SHALL cap it at 4 seats per student per event.
- IF the event is sold out, THEN THE system SHALL offer the waitlist.

### Story 2: Run an event
As a club officer, I want to create an event with a price and capacity so I can sell tickets.

- WHERE a user is an officer of a club, THE system SHALL let them create and edit only that club's events.
- WHILE an event has paid orders, THE system SHALL NOT allow capacity to drop below the number of seats sold.

### Story 3: Canceled event
As an attendee, I want an automatic refund if the event is canceled.

- WHEN an officer cancels an event, THE system SHALL refund every paid order through Stripe and email each attendee.
- IF a refund fails, THEN THE system SHALL flag the order for manual review.

---

## Data

We store each student's name, CMU email, and orders (event, seats, status, Stripe payment ID, never card numbers). A student sees only their own orders, an officer sees the attendee list only for their own club's events, and admins see everything.

---

## Non-Goals

- No ticket resale or transfers between students.
- No assigned seating or seat maps; every event is general admission.
- No users outside CMU.

---

## Red-Team Gap

**Overselling the last seats:** two students checking out at the same moment for the final seats could both pay.

- **Fix:** WHEN checkout begins, THE system SHALL hold the seats for 10 minutes, and IF payment is not completed, THEN THE system SHALL release them.
