/**
 * Owner-only access to /admin: one password (ADMIN_PASSWORD env var) and a
 * cookie session. The cookie holds HMAC(password, label), never the password,
 * so changing ADMIN_PASSWORD in Vercel signs every session out.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "sc_admin";
const SESSION_DAYS = 30;

function password(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

export function adminConfigured(): boolean {
  return password().length >= 12;
}

function sessionValue(pw: string): string {
  return createHmac("sha256", pw).update("splashy-admin-session-v1").digest("hex");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** True when the request carries a valid admin session. */
export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value ?? "";
  return same(value, sessionValue(password()));
}

/** For server actions: throws unless signed in. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Not signed in");
}

/** Checks the password; on success sets the session cookie. */
export async function signIn(attempt: string): Promise<boolean> {
  if (!adminConfigured()) return false;
  // Compare HMACs so the comparison is constant-time whatever the lengths.
  if (!same(sessionValue(attempt), sessionValue(password()))) return false;
  (await cookies()).set(ADMIN_COOKIE, sessionValue(password()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return true;
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
