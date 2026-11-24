"use client";

import { useActionState } from "react";
import { addHost, type AddHostState } from "./actions";

/** Add a host: generates their code and private dashboard link. */
export function AddHostForm() {
  const [state, action, pending] = useActionState(addHost, { status: "idle" } as AddHostState);

  return (
    <div className="sc-admin__addhost">
      {state.status === "done" && (
        <div className="sc-card sc-admin__created" role="status">
          <strong>Added {state.name} · code {state.code}</strong>
          <span>Share link: {state.shareUrl}</span>
          <span>Their private dashboard (send only to them): {state.dashboardUrl}</span>
        </div>
      )}
      <form action={action} className="sc-admin__form">
        <div className="sc-pair">
          <input className="sc-field" name="name" placeholder="Name *" required maxLength={100} />
          <input className="sc-field" name="email" type="email" placeholder="Email *" required />
        </div>
        <div className="sc-pair">
          <input className="sc-field" name="school" placeholder="School *" required maxLength={120} />
          <input className="sc-field" name="instagram" placeholder="@instagram" />
        </div>
        <div className="sc-pair">
          <input className="sc-field" name="venmo" placeholder="Venmo handle" />
          <label className="sc-admin__inline">
            Game starts <input className="sc-field" name="game_starts_on" type="date" />
          </label>
        </div>
        <label className="sc-admin__check">
          <input type="checkbox" name="boxes_enabled" defaultChecked /> Hands out school boxes
        </label>
        <p className="sc-hint">Box shipping address (needed to ship them a box):</p>
        <input className="sc-field" name="address1" placeholder="Street address" />
        <input className="sc-field" name="address2" placeholder="Apt, suite (optional)" />
        <div className="sc-pair">
          <input className="sc-field" name="city" placeholder="City" />
          <div className="sc-pair">
            <input className="sc-field" name="state" placeholder="State" maxLength={2} />
            <input className="sc-field" name="zip" placeholder="ZIP" maxLength={10} />
          </div>
        </div>
        {state.status === "error" && (
          <p className="sc-error" role="alert">
            {state.message}
          </p>
        )}
        <button className="sc-btn" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add host"}
        </button>
      </form>
    </div>
  );
}
