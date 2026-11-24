"use server";

/** Buyer "got it?" answer. The signed link is re-checked on every save. */
import { revalidatePath } from "next/cache";
import { verifyBuyerLink } from "@/lib/buyer-link";
import { createAdminClient } from "@/lib/supabase/admin";

export type GotItState = { status: "idle" | "saved" } | { status: "error"; message: string };

export async function answerGotIt(orderId: string, sig: string, _prev: GotItState, fd: FormData): Promise<GotItState> {
  const answer = String(fd.get("answer") ?? "");
  if (answer !== "yes" && answer !== "no") return { status: "error", message: "Pick yes or no." };
  if (!verifyBuyerLink(orderId, sig, process.env.BUYER_LINK_SECRET ?? "")) {
    return { status: "error", message: "This link isn't valid." };
  }

  try {
    const { data, error } = await createAdminClient()
      .from("orders")
      .update({ buyer_response: answer, buyer_responded_at: new Date().toISOString() })
      .eq("shopify_order_id", orderId)
      .neq("status", "cancelled")
      .select("id");
    if (error) throw error;
    if (!data?.length) return { status: "error", message: "We couldn't find this order." };
    revalidatePath(`/o/${orderId}/${sig}`);
    return { status: "saved" };
  } catch (err) {
    console.error("[got-it]", err);
    return { status: "error", message: "Something went wrong. Try again in a minute." };
  }
}
