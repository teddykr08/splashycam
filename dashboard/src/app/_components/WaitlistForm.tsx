"use client";

import { useActionState } from "react";
import { joinWaitlist, type WaitlistState } from "../actions";
import { HONEYPOT_FIELD } from "@/lib/launch";

const initial: WaitlistState = { status: "idle" };

export function WaitlistForm() {
  const [state, action, pending] = useActionState(joinWaitlist, initial);

  if (state.status === "done") {
    return (
      <p className="sc-done" role="status">
        You&apos;re on the list. See you in January!
      </p>
    );
  }

  const error = state.status === "error" ? state.message : null;
  return (
    <form action={action} className="sc-waitlist" noValidate={false}>
      <Honeypot />
      <label className="sr-only" htmlFor="waitlist-email">
        Email
      </label>
      <input
        className="sc-field"
        id="waitlist-email"
        name="email"
        type="email"
        autoComplete="email"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="Your email"
        defaultValue={state.status === "error" ? state.email : undefined}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "waitlist-error" : undefined}
      />
      <button className="sc-btn" type="submit" disabled={pending}>
        {pending ? "Adding you…" : "Notify me"}
      </button>
      {error && (
        <p className="sc-error" id="waitlist-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

/**
 * Spam trap. Hidden visually (off-screen, clipped) and from screen readers
 * (aria-hidden + inert), out of the tab order, never autofilled. People never see
 * it; bots that fill every field get a fake "thanks" and nothing is saved.
 */
export function Honeypot() {
  return (
    <div className="sc-honeypot" aria-hidden="true" inert>
      <label htmlFor={`hp-${HONEYPOT_FIELD}`}>Leave this empty</label>
      <input
        id={`hp-${HONEYPOT_FIELD}`}
        name={HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        defaultValue=""
      />
    </div>
  );
}
