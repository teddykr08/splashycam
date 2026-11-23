import Link from "next/link";
import { Footer, Logo } from "./_components/Site";

// Generic on purpose: an invalid host or buyer link looks exactly like any
// other missing page, so it never reveals whether a link ever existed.
export default function NotFound() {
  return (
    <>
      <main className="sc-section sc-hero">
        <div className="sc-wrap sc-stack">
          <Logo href="/" />
          <h1 className="sc-title sc-pitch">page not found</h1>
          <p className="sc-text">This link doesn&apos;t go anywhere.</p>
          <Link className="sc-btn" href="/">
            Go home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
