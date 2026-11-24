"use client";

import { useActionState } from "react";
import type { BuyerResponse } from "@/lib/rules";
import type { GotItState } from "../actions";

const initial: GotItState = { status: "idle" };

/** "got it?" yes / no. Shows their current answer and lets them change it. */
export function GotItButtons({
  current,
  action,
}: {
  current: BuyerResponse;
  action: (prev: GotItState, fd: FormData) => Promise<GotItState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="sc-gotit">
      <div className="sc-gotit__buttons">
        <button
          className={`sc-btn sc-gotit__btn${current === "yes" ? " sc-gotit__btn--on" : ""}`}
          type="submit"
          name="answer"
          value="yes"
          disabled={pending}
          aria-pressed={current === "yes"}
        >
          yes, got it
        </button>
        <button
          className={`sc-btn sc-btn--sky sc-gotit__btn${current === "no" ? " sc-gotit__btn--on" : ""}`}
          type="submit"
          name="answer"
          value="no"
          disabled={pending}
          aria-pressed={current === "no"}
        >
          no, not yet
        </button>
      </div>
      <p className="sc-hint" role="status">
        {state.status === "error"
          ? state.message
          : current === "yes"
            ? "awesome. have fun out there."
            : current === "no"
              ? "got it. we'll look into it and DM you."
              : ""}
      </p>
    </form>
  );
}
