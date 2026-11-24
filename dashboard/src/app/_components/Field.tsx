import type { ReactNode } from "react";

/** A labeled form field with its error underneath (linked via aria-describedby by the input). */
export function Field({
  id,
  label,
  error,
  small = false,
  children,
}: {
  id: string;
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

/** Props for a text input inside <Field>: refills after an error and marks it invalid. */
export function inputProps<K extends string>(
  id: K,
  errors: Partial<Record<K, string>>,
  values: Partial<Record<K, string>>,
) {
  return {
    id,
    defaultValue: values[id],
    name: id,
    className: "sc-field",
    "aria-invalid": errors[id] ? true : undefined,
    "aria-describedby": errors[id] ? `${id}-error` : undefined,
  } as const;
}
