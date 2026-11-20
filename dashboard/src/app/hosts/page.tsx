import type { Metadata } from "next";
import { Clip, Footer, Logo } from "../_components/Site";
import { HostForm } from "../_components/HostForm";

// /hosts is the public affiliate signup. (/host is reserved for the future host dashboard.)
export const metadata: Metadata = {
  title: "Splashy Cam affiliates",
  description: "Run your school's Senior Assassin game? Become a Splashy Cam affiliate.",
  openGraph: {
    title: "Splashy Cam affiliates",
    description: "Run your school's Senior Assassin game? Become a Splashy Cam affiliate.",
  },
};

export default function HostsPage() {
  return (
    <>
      <main>
        <section className="sc-section sc-hosts">
          <div className="sc-wrap sc-stack">
            <Logo href="/" />

            <h1 className="sc-title sc-pitch">Run your school&apos;s Senior Assassin game?</h1>
            <p className="sc-hosts__sub">Become a Splashy Cam affiliate.</p>
            <p className="sc-text sc-hosts__lead">
              You&apos;re the most direct line to your players. Get a cut of every sale you bring in, plus more ways to earn
              down the line. You get out of it as much as you put in.
            </p>

            <Clip small />

            <div className="sc-card sc-hosts__card">
              <h2 className="sc-hosts__formtitle">Sign up below</h2>
              <HostForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
