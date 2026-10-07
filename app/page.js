"use client";

import { useEffect, useState } from "react";

function formatPrice(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [name, setName] = useState("");
  const [seats, setSeats] = useState(1);
  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refreshEvents() {
    const response = await fetch("/api/events");
    if (!response.ok) {
      throw new Error("Could not load events. Please refresh the page.");
    }
    setEvents(await response.json());
  }

  useEffect(() => {
    refreshEvents().catch((error) => setMessage(error.message));
  }, []);

  const event = events[0];

  async function submitOrder() {
    setBusy(true);
    setMessage("");
    setOrder(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          studentName: name,
          seats: Number(seats),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.canWaitlist) await refreshEvents();
        throw new Error(result.error ?? "Could not reserve tickets.");
      }
      setOrder(result);
      await refreshEvents();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function simulatePayment() {
    if (!order) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/orders/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName: name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Payment simulation failed.");
      setOrder(result);
      setMessage("You’re all set — your tickets are confirmed!");
      await refreshEvents();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function joinWaitlist() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, studentName: name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not join the waitlist.");
      setMessage("You’re on the waitlist. We’ll hold your place!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Tartan Tickets home">
          <span className="brand-mark">T</span>
          <span>Tartan Tickets</span>
        </a>
        <span className="header-note">Made for the CMU community</span>
      </header>

      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">YOUR CAMPUS. YOUR PEOPLE. YOUR PLANS.</p>
          <h1>Find your next<br />favorite thing.</h1>
          <p className="hero-copy">
            Good things happen when Tartans get together. Find a club event and
            save your spot.
          </p>
          <a className="hero-link" href="#events">Explore events <span aria-hidden="true">↓</span></a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-card">
            <span className="art-dot" />
            <span className="art-ring" />
            <span className="art-word">TARTAN<br />TOGETHER</span>
            <span className="art-caption">CMU · PITTSBURGH</span>
          </div>
          <span className="spark spark-one">✳</span>
          <span className="spark spark-two">✳</span>
        </div>
      </section>

      <section id="events" className="events-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow burgundy">OUT AND ABOUT</p>
            <h2>Coming up on campus</h2>
          </div>
          <span className="event-count">{events.length} FEATURED EVENT</span>
        </div>

        {event ? (
          <article className="event-card">
            <div className="event-art" aria-label="Robotics Club event illustration">
              <span className="art-sun" />
              <span className="robot robot-left">✳</span>
              <span className="robot robot-right">✳</span>
              <span className="event-art-label">BUILD<br />SOMETHING<br />BRILLIANT.</span>
              <span className="event-art-tag">ROBOTICS CLUB · 2026</span>
            </div>
            <div className="event-details">
              <div className="event-title-row">
                <div>
                  <p className="club-label">CMU ROBOTICS CLUB</p>
                  <h3>{event.name}</h3>
                </div>
                <span className="price">{formatPrice(event.priceInCents)}<small> / ticket</small></span>
              </div>
              <p className="event-description">{event.description}</p>
              <div className="event-meta">
                <span><span className="meta-icon">◷</span>{event.date} · {event.time}</span>
                <span><span className="meta-icon">⌖</span>{event.location}</span>
              </div>
              <div className="availability">
                <span className={`availability-dot ${event.remainingSeats === 0 ? "sold-out" : ""}`} />
                {event.remainingSeats === 0
                  ? "Sold out"
                  : `${event.remainingSeats} spots left`}
              </div>
              {!order && event.remainingSeats > 0 && (
                <div className="checkout">
                  <label className="field-label" htmlFor="student-name">Your name</label>
                  <input
                    id="student-name"
                    autoComplete="name"
                    maxLength={80}
                    value={name}
                    onChange={(inputEvent) => setName(inputEvent.target.value)}
                    placeholder="Type your name"
                  />
                  <div className="checkout-controls">
                    <label className="field-label" htmlFor="ticket-count">Tickets</label>
                    <select
                      id="ticket-count"
                      value={seats}
                      onChange={(inputEvent) => setSeats(inputEvent.target.value)}
                    >
                      {[1, 2, 3, 4].map((count) => (
                        <option key={count} value={count}>{count} {count === 1 ? "ticket" : "tickets"}</option>
                      ))}
                    </select>
                    <span className="total">
                      Total <strong>{formatPrice(event.priceInCents * Number(seats))}</strong>
                    </span>
                  </div>
                  <button
                    className="primary-button"
                    disabled={busy || !name.trim()}
                    onClick={submitOrder}
                  >
                    {busy ? "Reserving…" : "Reserve tickets"}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
              {!order && event.remainingSeats === 0 && (
                <div className="checkout">
                  <label className="field-label" htmlFor="waitlist-name">Your name</label>
                  <input
                    id="waitlist-name"
                    autoComplete="name"
                    maxLength={80}
                    value={name}
                    onChange={(inputEvent) => setName(inputEvent.target.value)}
                    placeholder="Type your name"
                  />
                  <button className="primary-button" disabled={busy || !name.trim()} onClick={joinWaitlist}>
                    Join the waitlist <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
              {order && (
                <div className="order-panel">
                  <div>
                    <span className={`status-pill ${order.status}`}>{order.status}</span>
                    <p className="order-summary">
                      {order.seats} {order.seats === 1 ? "ticket" : "tickets"} ·{" "}
                      {formatPrice(order.totalInCents)}
                    </p>
                    {order.status === "pending" && (
                      <p className="hold-note">Your seats are held for 10 minutes.</p>
                    )}
                  </div>
                  {order.status === "pending" && (
                    <button className="primary-button payment-button" disabled={busy} onClick={simulatePayment}>
                      {busy ? "Confirming…" : "Simulated payment"}
                      <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              )}
              {message && <p className="feedback" role="status">{message}</p>}
            </div>
          </article>
        ) : (
          <div className="loading-card" aria-live="polite">Loading campus events…</div>
        )}
      </section>

      <footer>
        <span className="footer-brand"><span className="brand-mark small">T</span> Tartan Tickets</span>
        <span>For the CMU community, with love.</span>
      </footer>
    </main>
  );
}
