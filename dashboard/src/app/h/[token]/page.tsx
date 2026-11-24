import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { confirmHandoff } from "../actions";
import { CopyLink } from "../_components/CopyLink";
import { HandoffForm } from "../_components/HandoffForm";
import { Logo } from "../../_components/Site";
import { dollars } from "@/lib/host-dashboard";
import { loadHostDashboard } from "@/lib/host-data";
import { SHOP_TIME_ZONE } from "@/lib/rules";

// A host's private dashboard. The token in the URL is the only key: never
// indexed, never linked from anywhere public.
export const metadata: Metadata = {
  title: "Your Splashy Cam dashboard",
  robots: { index: false, follow: false },
};

const SITE = "https://www.splashycam.shop";

export default function HostDashboardPage({ params }: PageProps<"/h/[token]">) {
  return (
    <main className="sc-section sc-hostdash">
      <div className="sc-wrap sc-stack">
        <Logo href="/" />
        <Suspense fallback={<p className="sc-text">Loading your dashboard…</p>}>
          <Dashboard params={params} />
        </Suspense>
      </div>
    </main>
  );
}

const shipDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TIME_ZONE, weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));

async function Dashboard({ params }: { params: PageProps<"/h/[token]">["params"] }) {
  const { token } = await params;
  const data = await loadHostDashboard(token);
  if (!data) notFound();
  const { host, dashboard } = data;
  const shareUrl = `${SITE}/?host=${encodeURIComponent(host.code)}`;
  const box = dashboard.openBox;

  return (
    <>
      <h1 className="sc-title sc-pitch">hey {host.name.split(" ")[0]} 👋</h1>

      <section className="sc-card sc-hostdash__card" aria-labelledby="share-title">
        <h2 className="sc-hostdash__h" id="share-title">
          your link
        </h2>
        <p className="sc-hint">Share it with your players. Every order through it counts for you.</p>
        <CopyLink url={shareUrl} />
      </section>

      <section className="sc-hostdash__money" aria-label="Your earnings">
        <div className="sc-card sc-stat">
          <span className="sc-stat__label">earned so far</span>
          <strong className="sc-stat__num">{dollars(dashboard.earnedCents)}</strong>
        </div>
        <div className="sc-card sc-stat">
          <span className="sc-stat__label">paid out</span>
          <strong className="sc-stat__num">{dollars(dashboard.paidCents)}</strong>
        </div>
      </section>
      {dashboard.pendingCents > 0 && (
        <p className="sc-hint sc-hostdash__pending">
          + {dollars(dashboard.pendingCents)} more once those orders are handed off.
        </p>
      )}

      <section className="sc-card sc-hostdash__card" aria-labelledby="box-title">
        <h2 className="sc-hostdash__h" id="box-title">
          your school box
        </h2>
        {!box ? (
          <p className="sc-text">No box yet. It opens with your first School box order.</p>
        ) : box.reason === "pre_game" ? (
          <p className="sc-text">
            <strong>{box.orders}</strong> {box.orders === 1 ? "order" : "orders"} so far · ships {shipDate(box.shipsAt)}, a week
            before your game
          </p>
        ) : (
          <>
            <div className="sc-progress" role="img" aria-label={`${box.orders} of ${box.fullAt} orders`}>
              <div className="sc-progress__fill" style={{ width: `${Math.min(100, (box.orders / box.fullAt) * 100)}%` }} />
            </div>
            <p className="sc-text">
              <strong>
                {box.orders} of {box.fullAt}
              </strong>
              , ships when full · or {shipDate(box.shipsAt)} at the latest
            </p>
          </>
        )}
      </section>

      <section className="sc-hostdash__orders" aria-labelledby="orders-title">
        <h2 className="sc-hostdash__h" id="orders-title">
          orders
        </h2>
        {dashboard.orders.length === 0 ? (
          <p className="sc-text">No orders yet. Share your link to get the first one.</p>
        ) : (
          <ul className="sc-orderlist">
            {dashboard.orders.map((o) => (
              <li key={o.id} className="sc-card sc-order">
                <div className="sc-order__top">
                  <strong className="sc-order__name">{o.buyerName}</strong>
                  <span className="sc-order__meta">
                    {o.units} × {o.shipping === "box" ? "school box" : "ship to me"}
                  </span>
                </div>
                {o.needsHandoff ? (
                  <HandoffForm orderId={o.id} action={confirmHandoff.bind(null, token, o.id)} />
                ) : o.locked ? (
                  <p className="sc-error">Locked after too many wrong codes. Splashy Cam will sort it out with you.</p>
                ) : o.handedOff ? (
                  <p className="sc-handoff__done">✓ Handed off</p>
                ) : o.shipping === "alone" ? (
                  <p className="sc-hint">Ships straight to them.</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
