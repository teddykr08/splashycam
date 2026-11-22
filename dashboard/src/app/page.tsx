import Link from "next/link";
import { Clip, Footer, Logo } from "./_components/Site";
import { WaitlistForm } from "./_components/WaitlistForm";

const POINTS = ["Clip it onto your water gun.", "Film hands-free while you play.", "Share the replay with your game host."];

// "/" is about the mount only. Affiliates have their own page at /hosts.
export default function ProductPage() {
  return (
    <>
      <main>
        <section className="sc-section sc-hero">
          <div className="sc-wrap sc-stack">
            <header className="flex w-full items-center justify-between gap-3">
              <Logo />
            <Link href="/hosts" className="sc-hostlink">
              For game hosts <span aria-hidden="true">→</span>
            </Link>
            </header>

            <h1 className="sc-title sc-pitch">The phone mount for your water gun.</h1>
            <a className="sc-btn" href="#waitlist">Join the waitlist</a>
            <Clip />
            <ul className="sc-points">
              {POINTS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>

            <div id="waitlist" className="sc-signup sc-card">
              <h2 className="sc-when">Launching January.</h2>
              <p className="sc-text">Get one email when it drops.</p>
              <WaitlistForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
