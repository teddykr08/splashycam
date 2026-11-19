"use client";

import { useActionState, type ReactNode } from "react";
import { applyAsHost, type HostState } from "../actions";
import type { HostField } from "@/lib/launch";
import { Honeypot } from "./WaitlistForm";

const initial: HostState = { status: "idle" };

export function HostForm() {
  const [state, action, pending] = useActionState(applyAsHost, initial);

  if (state.status === "done") {
    return (
      <p className="sc-done" role="status">
        Got it! We&apos;ll DM you on Instagram soon.
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
      <div className="sc-pair">
        <Field id="game_starts_on" label="Game start date" error={errors.game_starts_on}>
          <input {...inputProps("game_starts_on", errors, values)} type="date" required />
        </Field>
        <Field id="player_count" label="Rough player count" error={errors.player_count}>
          <input {...inputProps("player_count", errors, values)} type="number" inputMode="numeric" min={1} max={5000} required />
        </Field>
      </div>

      {formError && (
        <p className="sc-error" role="alert">
          {formError}
        </p>
      )}
      <button className="sc-btn sc-btn--wide" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Get your school's spot"}
      </button>
    </form>
  );
}

function inputProps(id: HostField, errors: Partial<Record<HostField, string>>, values: Partial<Record<HostField, string>>) {
  return {
    id,
    defaultValue: values[id],
    name: id,
    className: "sc-field",
    "aria-invalid": errors[id] ? true : undefined,
    "aria-describedby": errors[id] ? `${id}-error` : undefined,
  } as const;
}

function Field({ id, label, error, children }: { id: HostField; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="sc-field-group">
      <label className="sc-label" htmlFor={id}>
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
