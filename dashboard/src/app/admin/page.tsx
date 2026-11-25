import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddHostForm } from "./AddHostForm";
import {
  logout,
  markBoxArrived,
  markBoxShipped,
  markPaid,
  markSoloShipped,
  setBoxesEnabled,
  setUnitsMade,
  unlockHandoff,
} from "./actions";
import { isAdmin } from "@/lib/admin-auth";
import { loadAdminData } from "@/lib/admin-data";
import {
  buildShipQueue,
  inventory,
  NO_SCHOOL,
  ordersForAdmin,
  owedByHost,
  reservationsBySchool,
  schoolOptions,
  unmatchedSchools,
} from "@/lib/admin-view";
import { dollars } from "@/lib/host-dashboard";
import { SHOP_TIME_ZONE, type Delivery } from "@/lib/rules";
import { VARIANT_TITLES } from "@/lib/variants";

export const metadata: Metadata = { title: "Admin · Splashy Cam", robots: { index: false, follow: false } };

const SITE = "https://www.splashycam.shop";

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="sc-admin">
      <Suspense fallback={<p className="sc-text">Loading…</p>}>
        <Admin searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TIME_ZONE, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );
const day = (ymd: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));

function Address({ value }: { value: unknown }) {
  const a = (value ?? {}) as Record<string, string | null>;
  if (!a.address1) return <span className="sc-error">no address</span>;
  return (
    <span className="sc-admin__addr">
      {a.name && <>{a.name}, </>}
      {a.address1}
      {a.address2 && <>, {a.address2}</>}, {a.city}, {a.province_code} {a.zip}
    </span>
  );
}

async function Admin({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  if (!(await isAdmin())) redirect("/admin/login");
  await connection(); // always rendered per request (it reads the clock)
  const sp = await searchParams;
  const school = typeof sp.school === "string" && sp.school ? sp.school : null;

  const now = new Date();
  const data = await loadAdminData();
  const queue = buildShipQueue(data.hosts, data.boxes, data.orders, now);
  const inv = inventory(data.unitsMade, data.orders);
  const owed = owedByHost(data.hosts, data.boxes, data.orders, now);
  const orders = ordersForAdmin(data.hosts, data.boxes, data.orders, now, school);
  const schools = schoolOptions(data.hosts);
  const hostInstagrams = new Set(data.hosts.map((h) => h.instagram?.toLowerCase()).filter(Boolean));
  const reservedBySchool = reservationsBySchool(data.reservations);
  const unmatched = unmatchedSchools(data.reservations, data.hosts);
  const flaggedCount = ordersForAdmin(data.hosts, data.boxes, data.orders, now).filter((v) => v.flags.length).length;

  return (
    <div className="sc-admin__wrap">
      <header className="sc-admin__top">
        <h1 className="sc-admin__title">Splashy Cam admin</h1>
        <form action={logout}>
          <button className="sc-admin__link" type="submit">
            Sign out
          </button>
        </form>
      </header>
      <nav className="sc-admin__nav" aria-label="Sections">
        <a href="#ship">Ship queue</a>
        <a href="#reservations">Reservations ({data.reservations.length})</a>
        <a href="#inventory">Inventory</a>
        <a href="#hosts">Hosts</a>
        <a href="#payouts">Payouts</a>
        <a href="#orders">Orders{flaggedCount ? ` (${flaggedCount} flagged)` : ""}</a>
      </nav>

      {/* 1. Ship queue */}
      <section id="ship" className="sc-admin__section">
        <h2>Ship queue</h2>

        <h3>Boxes ready to ship ({queue.readyBoxes.length})</h3>
        {queue.readyBoxes.length === 0 && <p className="sc-hint">Nothing ready.</p>}
        {queue.readyBoxes.map(({ box, host, orders: n, units }) => (
          <div key={box.id} className="sc-admin__row">
            <div>
              <strong>{host?.school ?? "?"}</strong> · {host?.name} · {n} orders, {units} units
              <br />
              <Address value={host?.ship_to} />
            </div>
            <form action={markBoxShipped.bind(null, box.id)} className="sc-admin__inlineform">
              <input className="sc-field" name="tracking" placeholder="Tracking #" />
              <button className="sc-btn" type="submit">
                Mark shipped
              </button>
            </form>
          </div>
        ))}

        <h3>Solo orders waiting ({queue.soloWaiting.length})</h3>
        {queue.soloWaiting.length === 0 && <p className="sc-hint">Nothing waiting.</p>}
        {queue.soloWaiting.map(({ order, shipDate }) => (
          <div key={order.id} className="sc-admin__row">
            <div>
              <strong>ship {day(shipDate)}</strong> · {order.buyer_name} · {order.units} unit{order.units > 1 ? "s" : ""}
              <br />
              <Address value={order.ship_to} />
            </div>
            <form action={markSoloShipped.bind(null, order.id)} className="sc-admin__inlineform">
              <input className="sc-field" name="tracking" placeholder="Tracking #" />
              <button className="sc-btn" type="submit">
                Mark shipped
              </button>
            </form>
          </div>
        ))}

        <h3>Boxes on the way ({queue.inTransit.length})</h3>
        {queue.inTransit.map(({ box, host, orders: n }) => (
          <div key={box.id} className="sc-admin__row">
            <div>
              {host?.school} · {host?.name} · {n} orders · shipped {box.shipped_at ? when(box.shipped_at) : "?"}
              {box.tracking && <> · {box.tracking}</>}
            </div>
            <form action={markBoxArrived.bind(null, box.id)}>
              <button className="sc-btn sc-btn--sky" type="submit">
                Mark arrived
              </button>
            </form>
          </div>
        ))}

        <h3>Boxes filling ({queue.fillingBoxes.length})</h3>
        {queue.fillingBoxes.map(({ box, host, orders: n, shipsAt }) => (
          <p key={box.id} className="sc-admin__line">
            {host?.school} · {host?.name} · {n} orders · ships {shipsAt ? when(shipsAt) : "?"}
          </p>
        ))}
      </section>

      {/* Reservations (pre-launch) + the old waitlist */}
      <section id="reservations" className="sc-admin__section">
        <h2>Reservations ({data.reservations.length} total)</h2>
        {reservedBySchool.length === 0 && <p className="sc-hint">No reservations yet.</p>}
        {reservedBySchool.map((g) => (
          <details key={g.school.toLowerCase()} className="sc-admin__group" open={reservedBySchool.length <= 5}>
            <summary>
              <strong>{g.school}</strong> · {g.rows.length} reserved
              {g.box > 0 && <> · {g.box} school box</>}
            </summary>
            <div className="sc-admin__table">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Name</th>
                    <th>Instagram</th>
                    <th>Email</th>
                    <th>Delivery</th>
                    <th>Host code</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{when(r.created_at)}</td>
                      <td>{r.name}</td>
                      <td>
                        <a href={`https://www.instagram.com/${r.instagram}/`} target="_blank" rel="noopener noreferrer">
                          @{r.instagram}
                        </a>
                      </td>
                      <td>{r.email}</td>
                      <td>{VARIANT_TITLES[r.delivery as Delivery] ?? r.delivery}</td>
                      <td>{r.host_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}

        <h3>Schools with no host ({unmatched.length})</h3>
        <p className="sc-hint">Typed in without a host link and matching no host&apos;s school. Similar names sit together.</p>
        {unmatched.length === 0 ? (
          <p className="sc-hint">None.</p>
        ) : (
          <ul className="sc-admin__emails">
            {unmatched.map((u) => (
              <li key={u.key}>
                <strong>{u.total}</strong> ·{" "}
                {u.names.map((n, i) => (
                  <span key={n.school}>
                    {i > 0 && " / "}
                    {n.school}
                    {u.names.length > 1 && <span className="sc-admin__small"> ({n.count})</span>}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}

        <h3>Old waitlist emails ({data.waitlist.length})</h3>
        {data.waitlist.length === 0 ? (
          <p className="sc-hint">None.</p>
        ) : (
          <ul className="sc-admin__emails">
            {data.waitlist.map((w) => (
              <li key={w.email}>
                {w.email} <span className="sc-admin__small">· {when(w.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2. Inventory */}
      <section id="inventory" className="sc-admin__section">
        <h2>Inventory</h2>
        <div className="sc-admin__stats">
          <span>
            <strong>{inv.made}</strong> made
          </span>
          <span>
            <strong>{inv.sold}</strong> sold
          </span>
          <span className={inv.left < 0 ? "sc-error" : ""}>
            <strong>{inv.left}</strong> left
          </span>
        </div>
        <form action={setUnitsMade} className="sc-admin__inlineform">
          <label className="sc-admin__inline">
            Units made <input className="sc-field" name="units_made" type="number" min={0} defaultValue={inv.made} />
          </label>
          <button className="sc-btn" type="submit">
            Save
          </button>
        </form>
      </section>

      {/* 3. Hosts */}
      <section id="hosts" className="sc-admin__section">
        <h2>Hosts</h2>

        <h3>Pipeline ({data.pipeline.length})</h3>
        <div className="sc-admin__table">
          <table>
            <thead>
              <tr>
                <th>Instagram</th>
                <th>Name</th>
                <th>School</th>
                <th>From</th>
                <th>DM status</th>
                <th>Game</th>
                <th>Players</th>
                <th>Host?</th>
              </tr>
            </thead>
            <tbody>
              {data.pipeline.map((p) => (
                <tr key={`${p.instagram}-${p.form_at ?? p.dm_at}`}>
                  <td>
                    {p.instagram && (
                      <a href={`https://www.instagram.com/${p.instagram}/`} target="_blank" rel="noopener noreferrer">
                        @{p.instagram}
                      </a>
                    )}
                  </td>
                  <td>{p.name}</td>
                  <td>{p.school}</td>
                  <td>{p.filled_form && p.source === "dm" ? "dm + form" : p.source}</td>
                  <td>{p.dm_status}</td>
                  <td>{p.game_starts_on ? `${p.game_starts_on} → ${p.game_ends_on ?? "?"}` : ""}</td>
                  <td>{p.player_count}</td>
                  <td>{p.instagram && hostInstagrams.has(p.instagram.toLowerCase()) ? "✓" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Add host</h3>
        <AddHostForm />

        <h3>Current hosts ({data.hosts.length})</h3>
        {data.hosts.map((h) => (
          <div key={h.id} className="sc-admin__row">
            <div>
              <strong>{h.school ?? "?"}</strong> · {h.name} · code {h.code}
              {h.instagram && <> · @{h.instagram}</>}
              {h.venmo_handle && <> · venmo @{h.venmo_handle}</>}
              <br />
              <span className="sc-admin__small">
                share: {SITE}/?host={h.code} · dashboard: {SITE}/h/{h.dashboard_token}
              </span>
            </div>
            <form action={setBoxesEnabled.bind(null, h.id, !h.boxes_enabled)}>
              <button className={`sc-btn${h.boxes_enabled ? "" : " sc-btn--sky"}`} type="submit">
                {h.boxes_enabled ? "Boxes on · turn off" : "Boxes off · turn on"}
              </button>
            </form>
          </div>
        ))}
      </section>

      {/* 4. Payouts */}
      <section id="payouts" className="sc-admin__section">
        <h2>Payouts owed</h2>
        {owed.length === 0 && <p className="sc-hint">Nobody is owed anything right now.</p>}
        {owed.map(({ host, cents, orderIds }) => (
          <div key={host.id} className="sc-admin__row">
            <div>
              <strong>{dollars(cents)}</strong> · {host.name} ({host.school}) · {orderIds.length} orders ·{" "}
              {host.venmo_handle ? `venmo @${host.venmo_handle}` : <span className="sc-error">no venmo handle</span>}
            </div>
            <form action={markPaid.bind(null, host.id)}>
              <button className="sc-btn" type="submit">
                Mark paid
              </button>
            </form>
          </div>
        ))}
      </section>

      {/* 5. Orders */}
      <section id="orders" className="sc-admin__section">
        <h2>All orders ({orders.length})</h2>
        <form className="sc-admin__inlineform" method="get" action="/admin#orders">
          <select className="sc-field" name="school" defaultValue={school ?? ""}>
            <option value="">All schools</option>
            {schools.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value={NO_SCHOOL}>{NO_SCHOOL}</option>
          </select>
          <button className="sc-btn sc-btn--sky" type="submit">
            Filter
          </button>
        </form>
        <div className="sc-admin__table">
          <table>
            <thead>
              <tr>
                <th>Flags</th>
                <th>Date</th>
                <th>Buyer</th>
                <th>School</th>
                <th>Units</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Code</th>
                <th>Handoff</th>
                <th>Buyer says</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(({ order: o, school: s, flags }) => (
                <tr key={o.id} className={flags.length ? "sc-admin__flagged" : ""}>
                  <td>
                    {flags.join(", ")}
                    {o.handoff_locked_at && !o.handed_off_at && (
                      <form action={unlockHandoff.bind(null, o.id)}>
                        <button className="sc-admin__link" type="submit">
                          unlock
                        </button>
                      </form>
                    )}
                  </td>
                  <td>{when(o.created_at)}</td>
                  <td>
                    {o.buyer_name}
                    <br />
                    <span className="sc-admin__small">{o.buyer_email}</span>
                  </td>
                  <td>{s ?? NO_SCHOOL}</td>
                  <td>
                    {o.units} × {o.shipping === "box" ? "box" : "solo"}
                  </td>
                  <td>{o.paid_cents != null ? dollars(o.paid_cents) : ""}</td>
                  <td>
                    {o.status}
                    {o.tracking && (
                      <>
                        <br />
                        <span className="sc-admin__small">{o.tracking}</span>
                      </>
                    )}
                  </td>
                  <td>{o.pickup_code}</td>
                  <td>{o.handed_off_at ? when(o.handed_off_at) : ""}</td>
                  <td>{o.buyer_response === "none" ? "" : o.buyer_response}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
