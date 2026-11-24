"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: null } as LoginState);
  return (
    <form action={action} className="sc-card sc-admin-login__form">
      <label className="sc-label" htmlFor="password">
        Password
      </label>
      <input id="password" name="password" type="password" className="sc-field" autoComplete="current-password" required />
      {state.error && (
        <p className="sc-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="sc-btn sc-btn--wide" type="submit" disabled={pending}>
        {pending ? "…" : "Sign in"}
      </button>
    </form>
  );
}
