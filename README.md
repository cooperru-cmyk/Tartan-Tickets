# Tartan Tickets

## Security spec audit

| Requirement | Result | Why |
|---|---|---|
| S1 | Partly | The order API returns 404 when the supplied name does not match the order owner, but names are self-entered and unauthenticated, so another person can claim the owner's name. |
| S2 | Fully | Order totals are calculated on the server from the event's stored price; the submitted browser price is not used. |
| S3 | Partly | The webhook checks an HMAC signature before marking an order paid, but it does not verify Stripe's webhook signature or raw Stripe event payload. |
| S4 | Partly | The eleventh attempt per normalized typed name within a minute returns 429, but there is no authenticated user or IP-based limiter, so attempts can bypass the limit by changing names. |
