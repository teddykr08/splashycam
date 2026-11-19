"use server";

/**
 * Server actions for the pre-launch page. They run only on the server and write
 * with the service-role client; the browser never talks to Supabase directly.
 */
import { isBot, parseHostApplication, parseWaitlist, type FieldErrors, type HostField } from "@/lib/launch";
import { createAdminClient } from "@/lib/supabase/admin";

const UNIQUE_VIOLATION = "23505";

export type WaitlistState = { status: "idle" | "done" } | { status: "error"; message: string; email?: string };
export type HostState =
  | { status: "idle" | "done" }
  | { status: "error"; message: string; errors?: FieldErrors<HostField>; values?: Partial<Record<HostField, string>> };

const HOST_FIELDS: HostField[] = ["name", "email", "instagram", "school", "game_starts_on", "player_count"];
/** What the person typed, so the form can refill after an error (React resets forms after an action). */
const typed = (fd: FormData) =>
  Object.fromEntries(HOST_FIELDS.map((k) => [k, String(fd.get(k) ?? "").slice(0, 200)])) as Partial<Record<HostField, string>>;

export async function joinWaitlist(_prev: WaitlistState, fd: FormData): Promise<WaitlistState> {
  if (isBot(fd)) return { status: "done" };
  const parsed = parseWaitlist(fd);
  if (!parsed.ok) {
    return { status: "error", message: parsed.errors.email ?? "Enter a valid email.", email: String(fd.get("email") ?? "").slice(0, 254) };
  }

  try {
    const { error } = await createAdminClient().from("waitlist").insert({ email: parsed.data.email });
    // Already on the list counts as success.
    if (error && error.code !== UNIQUE_VIOLATION) throw error;
    return { status: "done" };
  } catch (error) {
    console.error("[waitlist]", error);
    return { status: "error", message: "Something went wrong. Try again in a minute.", email: parsed.data.email };
  }
}

export async function applyAsHost(_prev: HostState, fd: FormData): Promise<HostState> {
  if (isBot(fd)) return { status: "done" };
  const parsed = parseHostApplication(fd);
  if (!parsed.ok) return { status: "error", message: "Check the highlighted fields.", errors: parsed.errors, values: typed(fd) };

  try {
    const { error } = await createAdminClient().from("host_applications").insert(parsed.data);
    if (error) throw error;
    return { status: "done" };
  } catch (error) {
    console.error("[host_applications]", error);
    return { status: "error", message: "Something went wrong. Try again in a minute.", values: typed(fd) };
  }
}
