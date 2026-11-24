import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { answerGotIt } from "../../actions";
import { GotItButtons } from "../../_components/GotItButtons";
import { Logo } from "../../../_components/Site";
import { verifyBuyerLink } from "@/lib/buyer-link";
import { loadBuyerView } from "@/lib/buyer-data";
import type { BuyerView } from "@/lib/buyer-view";
import { SHOP_TIME_ZONE } from "@/lib/rules";

// The buyer's order page, linked from their Shopify order confirmation email.
// The signed link is the only key. Never indexed.
export const metadata: Metadata = {
  title: "Your Splashy Cam order",
  robots: { index: false, follow: false },
};

export default function BuyerOrderPage({ params }: PageProps<"/o/[orderId]/[sig]">) {
  return (
    <main className="sc-section sc-buyer">
      <div className="sc-wrap sc-stack">
        <Logo href="/" />
        <Suspense fallback={<p className="sc-text">Loading your order…</p>}>
          <BuyerOrder params={params} />
        </Suspense>
      </div>
    </main>
  );
}

const day = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: value.length === 10 ? "UTC" : SHOP_TIME_ZONE, // YYYY-MM-DD is already a shop-time date
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));

function statusLine(v: BuyerView): string {
  const host = v.hostFirstName ?? "your host";
  switch (v.stage) {
    case "cancelled":
      return "This order was cancelled.";
    case "box_filling":
      return v.shipsBy ? `Your school box ships to ${host} by ${day(v.shipsBy)}.` : `Your school box ships to ${host} soon.`;
    case "box_on_the_way":
      return `Your school box is on its way to ${host}.`;
    case "at_host":
      return `Your mount is with ${host}. Go grab it!`;
    case "handed_off":
      return `${host} marked yours as picked up.`;
    case "solo_preparing":
      return v.shipsBy ? `Ships to you ${day(v.shipsBy)}.` : "Ships to you soon.";
    case "solo_shipped":
      return "It's on its way to you.";
  }
}

async function BuyerOrder({ params }: { params: PageProps<"/o/[orderId]/[sig]">["params"] }) {
  const { orderId, sig } = await params;
  if (!verifyBuyerLink(orderId, sig, process.env.BUYER_LINK_SECRET ?? "")) notFound();

  const v = await loadBuyerView(orderId);
  if (!v) {
    return (
      <>
        <h1 className="sc-title sc-pitch">almost there</h1>
        <p className="sc-text">We&apos;re setting up your order. Refresh this page in a minute.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="sc-title sc-pitch">hey {v.firstName} 👋</h1>
      <p className="sc-text">
        {v.units} × Splashy Cam · {v.shipping === "box" ? "school box" : "ship to me"}
      </p>

      {v.pickupCode && v.stage !== "cancelled" && (
        <section className="sc-card sc-pickup" aria-labelledby="pickup-title">
          <h2 className="sc-pickup__label" id="pickup-title">
            your pickup code
          </h2>
          <p className="sc-pickup__code">{v.pickupCode}</p>
          <p className="sc-hint">Show this to {v.hostFirstName ?? "your host"} when you pick up your mount.</p>
        </section>
      )}

      <p className="sc-buyer__status">{statusLine(v)}</p>

      {v.canConfirm && (
        <section className="sc-card sc-buyer__card" aria-labelledby="gotit-title">
          <h2 className="sc-hostdash__h" id="gotit-title">
            got it?
          </h2>
          <GotItButtons current={v.response} action={answerGotIt.bind(null, orderId, sig)} />
        </section>
      )}
    </>
  );
}
