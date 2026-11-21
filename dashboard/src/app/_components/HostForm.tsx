"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { applyAsHost, type HostState } from "../actions";
import { checkGameDates, type HostField } from "@/lib/launch";
import { Honeypot } from "./WaitlistForm";

const initial: HostState = { status: "idle" };

export function HostForm() {
  const [state, action, pending] = useActionState(applyAsHost, initial);

  if (state.status === "done") {
    return (
      <p className="sc-done" role="status">
        you&apos;re in. we&apos;ll DM you on instagram soon.
      </p>
    );
  }

  const errors = state.status === "error" ? (state.errors ?? {}) : {};
  const formError = state.status === "error" ? state.message : null;
  const values = state.status === "error" ? (state.values ?? {}) : {};

  return (
    <form action={action} className="sc-host-form">
      <Honeypot />
      <Field id="name" label="Your name" error={errors.name}>
        <input {...inputProps("name", errors, values)} autoComplete="name" required maxLength={100} />
      </Field>
      <Field id="email" label="Email" error={errors.email}>
        <input {...inputProps("email", errors, values)} type="email" autoComplete="email" autoCapitalize="off" spellCheck={false} required />
      </Field>
      <Field id="instagram" label="Instagram handle" error={errors.instagram}>
        <input {...inputProps("instagram", errors, values)} placeholder="@yourhandle" autoCapitalize="off" spellCheck={false} required />
      </Field>
      <Field id="school" label="School" error={errors.school}>
        <input {...inputProps("school", errors, values)} autoComplete="organization" required maxLength={120} />
      </Field>
      <GameDates errors={errors} values={values} />
      <Field id="player_count" label="Rough player count" error={errors.player_count}>
        <input {...inputProps("player_count", errors, values)} type="number" inputMode="numeric" min={1} max={5000} required />
      </Field>

      {formError && (
        <p className="sc-error" role="alert">
          {formError}
        </p>
      )}
      <button className="sc-btn sc-btn--wide" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Sign me up"}
      </button>
    </form>
  );
}

type Errors = Partial<Record<HostField, string>>;
type Values = Partial<Record<HostField, string>>;

/**
 * Estimated start and end dates. Both required; the end date can't be before the start.
 * The browser blocks the submit with the same messages the server returns
 * (checkGameDates), and the end picker can't go earlier than the start.
 */
function GameDates({ errors, values }: { errors: Errors; values: Values }) {
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const [start, setStart] = useState(values.game_starts_on ?? "");

  const validate = () => {
    const s = startRef.current;
    const e = endRef.current;
    if (!s || !e) return;
    const { errors: dateErrors } = checkGameDates(s.value, e.value);
    s.setCustomValidity(dateErrors.game_starts_on ?? "");
    e.setCustomValidity(dateErrors.game_ends_on ?? "");
    setStart(s.value);
  };
  useEffect(validate, []);

  return (
    <fieldset className="sc-field-group sc-dates">
      <legend className="sc-label">Game dates</legend>
      <p className="sc-hint">Estimates are fine. Your best guess works.</p>
      <div className="sc-pair">
        <Field id="game_starts_on" label="Estimated start date" error={errors.game_starts_on} small>
          <input {...inputProps("game_starts_on", errors, values)} ref={startRef} type="date" required onChange={validate} />
        </Field>
        <Field id="game_ends_on" label="Estimated end date" error={errors.game_ends_on} small>
          <input
            {...inputProps("game_ends_on", errors, values)}
            ref={endRef}
            type="date"
            required
            min={start || undefined}
            onChange={validate}
          />
        </Field>
      </div>
    </fieldset>
  );
}

function inputProps(id: HostField, errors: Errors, values: Values) {
  return {
    id,
    defaultValue: values[id],
    name: id,
    className: "sc-field",
    "aria-invalid": errors[id] ? true : undefined,
    "aria-describedby": errors[id] ? `${id}-error` : undefined,
  } as const;
}

function Field({
  id,
  label,
  error,
  small = false,
  children,
}: {
  id: HostField;
  label: string;
  error?: string;
  small?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="sc-field-group">
      <label className={small ? "sc-label sc-label--small" : "sc-label"} htmlFor={id}>
        {label}
      </label>
      {children}
      {error && (
        <p className="sc-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
