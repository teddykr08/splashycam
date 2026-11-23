import Link from "next/link";
import { Clip, Footer, Logo } from "./_components/Site";
import { WaitlistForm } from "./_components/WaitlistForm";

const POINTS = ["clips onto your water gun in seconds", "both hands free, phone stays steady", "proof nobody can argue with"];

// "/" is about the mount only. Affiliates have their own page at /hosts.
export default function ProductPage() {
  return (
    <>
      <main>
        <section className="sc-section sc-hero">
          <div className="sc-wrap sc-stack">
            <Logo />
            <Link href="/hosts" className="sc-hostlink">
              Run your school&apos;s game? Become an affiliate <span aria-hidden="true">→</span>
            </Link>

            <h1 className="sc-title sc-pitch">A phone mount for any water gun. Film your kills hands free.</h1>

            <Clip />

            <ul className="sc-points">
              {POINTS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>

            <div className="sc-signup">
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
