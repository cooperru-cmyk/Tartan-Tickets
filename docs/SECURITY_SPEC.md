# Tartan Tickets: Security Requirements (EARS)

- **S1:** IF a user requests an order they do not own, THEN THE API SHALL return 404.
- **S2:** THE system SHALL calculate the price on the server from the event record and SHALL ignore any price sent by the browser.
- **S3:** WHEN a Stripe webhook arrives, THE API SHALL verify its signature before marking any order paid.
- **S4:** IF a user makes more than 10 checkout attempts in one minute, THEN THE API SHALL return 429.
