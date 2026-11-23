"use client";

import { useEffect, useState, type FormEvent } from "react";
import { boxes, initialHosts, money, orders, type Host } from "./sample-data";
import styles from "./admin.module.css";

const sections = ["Purchases", "Hosts", "School boxes", "Payouts"] as const;
type Section = (typeof sections)[number];
type Payment = { host: string; date: string; ids: string[] };

function hostDemoUrl(host: Host) {
  const url = new URL("/admin", window.location.origin);
  // Carry only fictional display data so even a newly added demo opens in a fresh tab.
  url.hash = new URLSearchParams({ demo: host.token, host: host.name, school: host.school, code: host.code }).toString();
  return url.toString();
}

export default function AdminPreview() {
  const [section, setSection] = useState<Section>("Purchases");
  const [hosts, setHosts] = useState(initialHosts);
  const [payments, setPayments] = useState<Payment[]>([{ host: "JUNIPER", date: "Jan 9", ids: ["101"] }]);
  const [notice, setNotice] = useState("");
  const [origin, setOrigin] = useState("");
  const [demo, setDemo] = useState<Host | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    const readDemo = () => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const token = params.get("demo");
      setDemo(token ? { token, name: params.get("host") || "Sample host", school: params.get("school") || "Sample school", code: params.get("code") || "" } : null);
    };
    readDemo();
    window.addEventListener("hashchange", readDemo);
    return () => window.removeEventListener("hashchange", readDemo);
  }, []);

  function addHost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const school = String(data.get("school") ?? "").trim();
    if (!name || !school) { setNotice("Enter a name and school."); return; }
    const token = crypto.randomUUID();
    const code = (school.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase() || "HOST") + "-" + token.slice(0, 8).toUpperCase();
    setHosts(previous => [{ name, school, token, code }, ...previous]);
    form.reset();
    setNotice("Added " + name + " to the demo.");
  }

  const hostFor = (code: string) => hosts.find(host => host.code === code)!;
  const paidIds = new Set(payments.flatMap(payment => payment.ids));
  const total = (ids: string[]) => money(orders.filter(order => ids.includes(order.id)).reduce((sum, order) => sum + order.cents, 0));

  return <main className={styles.page}>
    <header><p className={styles.tag}>Sample data</p><h1>{demo ? demo.school : "Admin preview"}</h1>
      <p>{demo ? "Host preview for " + demo.name : "Fictional records. Changes reset when you refresh."}</p></header>
    {demo ? <section><h2>Your share link</h2><a href={origin + "/?host=" + encodeURIComponent(demo.code)}>{origin}/?host={demo.code}</a>
      <p>Orders through your link: {orders.filter(order => order.host === demo.code).length}</p>
      <a href="/admin">Back to admin</a></section> : <>
    <nav aria-label="Admin sections">{sections.map(item => <button key={item} aria-current={item === section ? "page" : undefined}
      onClick={() => { setSection(item); setNotice(""); }}>{item}</button>)}</nav>
    <h2>{section}</h2>
    {section === "Purchases" && orders.map(order => <article key={order.id}>
      <small>Order #{order.id} · {order.date}</small><h3>{order.buyer}</h3>
      <p>{hostFor(order.host).school} · Host {hostFor(order.host).name}</p>
      <p>{order.box ? "School pickup · Box " + order.box : "Direct shipping"} · {order.delivery}</p></article>)}
    {section === "Hosts" && <>
      <form onSubmit={addHost}><h3>Add a sample host</h3><label>Host name<input name="name" maxLength={80} required /></label>
        <label>School<input name="school" maxLength={100} required /></label><button>Add host</button></form>
      {hosts.map(host => <article key={host.code}><h3>{host.name}</h3><p>{host.school}</p>
        <p>Code <strong>{host.code}</strong> · Orders {orders.filter(order => order.host === host.code).length}</p>
        {origin && <><p>Player referral link<br/><a href={origin + "/?host=" + host.code}>{origin}/?host={host.code}</a></p>
          <a href={hostDemoUrl(host)}>Private host demo link</a></>}</article>)}</>}
    {section === "School boxes" && boxes.map(box => {
      const contents = orders.filter(order => order.box === box.id);
      return <article key={box.id}><small>Box {box.id}</small><h3>{hostFor(box.host).school}</h3><p>{box.status}</p>
        <details><summary>View purchases ({contents.length})</summary>{contents.map(order => <p key={order.id}>#{order.id} · {order.buyer} · {order.delivery}</p>)}</details></article>;
    })}
    {section === "Payouts" && <>
      {hosts.map(host => {
        const unpaid = orders.filter(order => order.host === host.code && !paidIds.has(order.id));
        const eligible = unpaid.filter(order => order.payout === "Eligible").map(order => order.id);
        const pending = unpaid.filter(order => order.payout === "Pending").map(order => order.id);
        return <article key={host.code}><h3>{host.name}</h3><p>{host.school}</p>
          <p>Eligible <strong>{total(eligible)}</strong> · Pending confirmation {total(pending)}</p>
          {eligible.length > 0 && <button onClick={() => {
            setPayments(previous => previous.some(payment => payment.ids.some(id => eligible.includes(id))) ? previous :
              [{ host: host.code, date: "This session", ids: eligible }, ...previous]);
            setNotice("Recorded a sample payout for " + host.name + ".");
          }}>Mark {total(eligible)} as paid</button>}</article>;
      })}
      <h3>Paid history</h3>{payments.map(payment => <article key={payment.ids.join("-")}><strong>{total(payment.ids)} · {hostFor(payment.host).name}</strong>
        <p>{payment.date} · Orders {payment.ids.map(id => "#" + id).join(", ")}</p></article>)}</>}
    <p role="status">{notice}</p></>}
  </main>;
}
