"use client";

import { useActionState } from "react";
import type { HandoffState } from "../actions";

const initial: HandoffState = { status: "idle" };

/** Type the buyer's pickup code when you hand over their mount. */
export function HandoffForm({
  orderId,
  action,
}: {
  orderId: string;
  action: (prev: HandoffState, fd: FormData) => Promise<HandoffState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  if (state.status === "done") {
    return (
      <p className="sc-handoff__done" role="status">
        ✓ Handed off
      </p>
    );
  }

  const error = state.status === "error" ? state.message : null;
  const id = `code-${orderId}`;
  return (
    <form action={formAction} className="sc-handoff">
      <label className="sc-label sc-label--small" htmlFor={id}>
        Their pickup code
      </label>
      <div className="sc-handoff__row">
        <input
          id={id}
          name="code"
          className="sc-field sc-handoff__input"
          placeholder="ABC123"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button className="sc-btn" type="submit" disabled={pending}>
          {pending ? "…" : "Confirm"}
        </button>
      </div>
      {error && (
        <p className="sc-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
