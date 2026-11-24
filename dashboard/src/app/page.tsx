import Link from "next/link";
import { Suspense } from "react";
import { Clip, Footer, Logo } from "./_components/Site";
import { BuyForm, ReserveForm, type Visit } from "./_components/OrderForms";
import { findHostByCode } from "@/lib/host-data";
import { deliveryOptions, readStoreConfig } from "@/lib/store";

const POINTS = ["clips onto your water gun in seconds", "both hands free, phone stays steady", "proof nobody can argue with"];

// "/" is the whole store: one product, one buy flow. Affiliates have their own page at /hosts.
// Until STORE_OPEN is on, the buy flow is hidden and a free reservation form shows instead.
// Keep prices, cuts and payouts off this page until launch.
export default function ProductPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Link href="/hosts" className="sc-topbar">
        Run your school&apos;s game? <strong>Become an affiliate</strong> <span aria-hidden="true">→</span>
      </Link>
      <main>
        <section className="sc-section sc-hero">
          <div className="sc-wrap sc-stack">
            <Logo />

            <h1 className="sc-title sc-pitch">A phone mount for any water gun. Film your kills hands free.</h1>

            <Clip />

            <ul className="sc-points">
              {POINTS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>

            <div className="sc-signup" id="get-yours">
              <Suspense fallback={<div className="sc-order-placeholder" aria-busy="true" />}>
                <GetYours searchParams={searchParams} />
              </Suspense>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/** Reads ?host= (and the host's school and boxes setting) per request. */
async function GetYours({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { host: code } = await searchParams;
  let host = null;
  try {
    host = await findHostByCode(code);
  } catch (error) {
    // The page still works without the host: Ship to me only, school typed in.
    console.error("[/ host lookup]", error);
  }
  const visit: Visit = { hostCode: host?.code ?? null, school: host?.school ?? null, options: deliveryOptions(host) };

  if (readStoreConfig(process.env)) {
    return (
      <>
        <h2 className="sc-when">Get yours.</h2>
        <BuyForm visit={visit} />
      </>
    );
  }
  return (
    <>
      <h2 className="sc-when">Launching January.</h2>
      <p className="sc-text">reserve yours, pay at launch.</p>
      <ReserveForm visit={visit} />
    </>
  );
}
