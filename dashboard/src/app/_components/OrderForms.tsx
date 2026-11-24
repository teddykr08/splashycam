"use client";

import { useActionState } from "react";
import { reserve, startCheckout, type CheckoutState, type ReserveState } from "../actions";
import type { ReservationField } from "@/lib/launch";
import type { Delivery } from "@/lib/rules";
import { MAX_QUANTITY } from "@/lib/store";
import { VARIANT_TITLES } from "@/lib/variants";
import { Field, inputProps } from "./Field";
import { Honeypot } from "./Honeypot";

/** What "/" knows about the visitor's host link (looked up on the server). */
export interface Visit {
  hostCode: string | null;
  /** The host's school: shown locked in the reservation form. */
  school: string | null;
  /** School box only through a host link with boxes on (store.deliveryOptions). */
  options: Delivery[];
}

const HINTS: Record<Delivery, string> = { box: "pick it up at school", alone: "mailed to you" };

/**
 * School box / Ship to me. With one option there's nothing to pick, so it just
 * says how it gets to them.
 */
function DeliveryChoice({ options, picked, error }: { options: Delivery[]; picked?: string; error?: string }) {
  if (options.length === 1) {
    return (
      <p className="sc-hint sc-delivery__only">
        {`${VARIANT_TITLES[options[0]]}: ${HINTS[options[0]]}.`}
      </p>
    );
  }
  return (
    <fieldset className="sc-field-group sc-delivery" aria-describedby={error ? "delivery-error" : undefined}>
      <legend className="sc-label">How do you want it?</legend>
      <div className="sc-delivery__options">
        {options.map((d) => (
          <label key={d} className="sc-delivery__option">
            <input type="radio" name="delivery" value={d} defaultChecked={picked === d} required />
            <span>
              <strong>{VARIANT_TITLES[d]}</strong>
              <small>{HINTS[d]}</small>
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p className="sc-error" id="delivery-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

const reserveInitial: ReserveState = { status: "idle" };

/** The free reservation: "reserve yours, pay at launch". No quantity, no payment. */
export function ReserveForm({ visit }: { visit: Visit }) {
  const [state, action, pending] = useActionState(reserve, reserveInitial);

  if (state.status === "done") {
    return (
      <p className="sc-done" role="status">
        {state.already ? "you're already reserved." : "you're reserved."} we&apos;ll DM you when it drops.
      </p>
    );
  }

  const errors: Partial<Record<ReservationField, string>> = state.status === "error" ? (state.errors ?? {}) : {};
  const values: Partial<Record<ReservationField, string>> = state.status === "error" ? (state.values ?? {}) : {};
  const formError = state.status === "error" ? state.message : null;

  return (
    <form action={action} className="sc-card sc-order-form">
      <Honeypot />
      {visit.hostCode && <input type="hidden" name="host" value={visit.hostCode} />}
      <Field id="name" label="Your name" error={errors.name}>
        <input {...inputProps("name", errors, values)} autoComplete="name" required maxLength={100} />
      </Field>
      <Field id="instagram" label="Instagram handle" error={errors.instagram}>
        <input {...inputProps("instagram", errors, values)} placeholder="@yourhandle" autoCapitalize="off" spellCheck={false} required />
      </Field>
      <Field id="email" label="Email (optional)" error={errors.email}>
        <input {...inputProps("email", errors, values)} type="email" autoComplete="email" autoCapitalize="off" spellCheck={false} />
      </Field>
      {visit.school ? (
        <Field id="school" label="School">
          <input id="school" className="sc-field sc-field--locked" value={visit.school} readOnly aria-readonly="true" />
        </Field>
      ) : (
        <Field id="school" label="School" error={errors.school}>
          <input {...inputProps("school", errors, values)} autoComplete="organization" required maxLength={120} />
        </Field>
      )}
      <DeliveryChoice options={visit.options} picked={values.delivery} error={errors.delivery} />

      {formError && (
        <p className="sc-error" role="alert">
          {formError}
        </p>
      )}
      <button className="sc-btn sc-btn--wide" type="submit" disabled={pending}>
        {pending ? "Reserving…" : "Reserve mine"}
      </button>
    </form>
  );
}

const checkoutInitial: CheckoutState = { status: "idle" };

/** The buy flow (only when STORE_OPEN): delivery + quantity → Shopify checkout. */
export function BuyForm({ visit }: { visit: Visit }) {
  const [state, action, pending] = useActionState(startCheckout, checkoutInitial);

  return (
    <form action={action} className="sc-card sc-order-form">
      {visit.hostCode && <input type="hidden" name="host" value={visit.hostCode} />}
      <DeliveryChoice options={visit.options} />
      <Field id="quantity" label="How many?" small>
        <input id="quantity" name="quantity" className="sc-field sc-field--qty" type="number" inputMode="numeric" min={1} max={MAX_QUANTITY} defaultValue={1} required />
      </Field>
      {state.status === "error" && (
        <p className="sc-error" role="alert">
          {state.message}
        </p>
      )}
      <button className="sc-btn sc-btn--wide" type="submit" disabled={pending}>
        {pending ? "One sec…" : "Checkout"}
      </button>
    </form>
  );
}
