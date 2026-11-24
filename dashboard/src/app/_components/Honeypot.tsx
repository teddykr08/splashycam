import { HONEYPOT_FIELD } from "@/lib/launch";

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
