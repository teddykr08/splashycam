import type { Metadata } from "next";
import { Clip, Footer, INSTAGRAM, Logo } from "../_components/Site";
import { HostForm } from "../_components/HostForm";

// /hosts is the public affiliate signup. (/host is reserved for the future host dashboard.)
// Keep the copy vague: no percentages, prices, payout methods, boxes, discounts or pot.
const TITLE = "Become a Splashy Cam affiliate";
const DESCRIPTION = "Run your school's Senior Assassin game? Get a cut of every sale you bring in. Free to join.";
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "Splashy Cam", url: "/hosts", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const STEPS = [
  { title: "sign up below", text: "takes a minute." },
  { title: "get your own link", text: "share it with your players." },
  { title: "earn a cut", text: "of every order that comes through it." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "is this a scam?", a: "no. it's free, you never pay or buy anything. you just share a link." },
  { q: "does it cost anything?", a: "nothing, ever." },
  {
    q: "what do i actually do?",
    a: "share your link with your players however you want (story, post, group chat). how much you share is up to you.",
  },
  { q: "how do i get paid?", a: "you get a cut of every sale through your link. we'll send you the details once you're approved." },
  { q: "when does it launch?", a: "january." },
  { q: "our game already started, can i still join?", a: "yes. that's why we ask for your dates." },
];

export default function HostsPage() {
  return (
    <>
      <main>
        <section className="sc-section sc-hosts">
          <div className="sc-wrap sc-stack">
            <Logo href="/" />

            <ul className="sc-trust" aria-label="About Splashy Cam">
              <li>
                <a href={`https://www.instagram.com/${INSTAGRAM}/`} target="_blank" rel="noopener noreferrer">
                  {`@${INSTAGRAM}`}
                </a>
              </li>
              <li>free to join · no cost ever</li>
            </ul>

            <h1 className="sc-title sc-pitch">Run your school&apos;s Senior Assassin game?</h1>
            <p className="sc-hosts__sub">Become a Splashy Cam affiliate.</p>
            <p className="sc-text sc-hosts__lead">
              You&apos;re the most direct line to your players. Get a cut of every sale you bring in, plus more ways to earn
              down the line. You get out of it as much as you put in.
            </p>

            <Clip small />

            <section className="sc-steps" aria-labelledby="how-title">
              <h2 className="sc-steps__title" id="how-title">
                how it works
              </h2>
              <ol className="sc-steps__list">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="sc-steps__item">
                    <span className="sc-steps__num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span>
                      <strong>{step.title}</strong> {step.text}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <div className="sc-card sc-hosts__card" id="signup">
              <HostForm />
            </div>

            <section className="sc-faq" aria-labelledby="faq-title">
              <h2 className="sc-faq__title" id="faq-title">
                questions
              </h2>
              {FAQ.map(({ q, a }) => (
                <details key={q} className="sc-faq__item">
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
