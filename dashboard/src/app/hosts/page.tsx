import type { Metadata } from "next";
import { Footer, Logo } from "../_components/Site";
import { HostForm } from "../_components/HostForm";

// /hosts is the public affiliate signup. (/host is reserved for the future host dashboard.)
// Keep the copy vague: no percentages, prices, payout methods, boxes, discounts or pot.
const TITLE = "Become a Splashy Cam affiliate";
const DESCRIPTION = "Run your school's Senior Assassin game? Sign up to share Splashy Cam with your players.";
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "Splashy Cam", url: "/hosts", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const STEPS = [
  { title: "Introduce your game.", text: "Tell us which school you host and when you play." },
  { title: "Get your affiliate link.", text: "Use it to introduce players to Splashy Cam." },
  { title: "Share with your school.", text: "Post your link in a story or your game group chat." },
];

const FAQ = [
  { q: "Who can sign up?", a: "Hosts who run their school’s Senior Assassin game." },
  { q: "Can I join if our game has started?", a: "Yes. Include your game dates in the signup form." },
  { q: "When does Splashy Cam launch?", a: "January." },
];

export default function HostsPage() {
  return (
    <>
      <main>
        <section className="sc-section sc-hosts">
          <div className="sc-wrap sc-stack">
            <Logo href="/" />

            <h1 className="sc-title sc-pitch">Run your school&apos;s Senior Assassin game?</h1>
            <p className="sc-text sc-hosts__lead">
              Become a Splashy Cam affiliate and introduce your players to the phone mount for hands-free game clips.
            </p>
            <a href="#signup" className="sc-btn">Sign up as a host</a>

            <section className="sc-steps" aria-labelledby="how-title">
              <h2 className="sc-steps__title" id="how-title">
                How it works
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
                Host questions
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
