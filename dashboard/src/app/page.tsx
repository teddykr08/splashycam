import { existsSync } from "node:fs";
import path from "node:path";
import { HostForm } from "./_components/HostForm";
import { WaitlistForm } from "./_components/WaitlistForm";

// Drop these into dashboard/public/ and redeploy. Until then, labeled placeholders show.
const CLIP = "launch-clip.mp4"; // tall 9:16 works best; plays muted on a loop
const LOGO = "logo.jpg"; // square works; transparent PNG also fine (change this name)
const INSTAGRAM = "splashycam.shop";

const inPublic = (file: string) => existsSync(path.join(process.cwd(), "public", file));

export default function LaunchPage() {
  const hasClip = inPublic(CLIP);
  const hasLogo = inPublic(LOGO);

  return (
    <>
      <main>
        <section className="sc-section sc-launch">
          <div className="sc-wrap sc-launch__wrap">
            <div className="sc-launch__logo">
              {hasLogo ? (
                // A plain img keeps any logo size/format working without config.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/${LOGO}`} alt="Splashy Cam" className="sc-launch__logo-img" />
              ) : (
                <Placeholder label="Your logo" hint={`dashboard/public/${LOGO}`} />
              )}
            </div>

            <h1 className="sc-title sc-launch__pitch">A phone mount for any water gun. Film your kills hands free.</h1>

            <div className="sc-card sc-launch__video">
              {hasClip ? (
                <video src={`/${CLIP}`} autoPlay loop muted playsInline preload="metadata" aria-label="Splashy Cam in action" />
              ) : (
                <Placeholder label="Your clip" hint={`dashboard/public/${CLIP}`} />
              )}
            </div>

            <div className="sc-launch__signup">
              <h2 className="sc-launch__when">Launching January.</h2>
              <p className="sc-text">Get one email when it drops.</p>
              <WaitlistForm />
            </div>
          </div>
        </section>

        <section className="sc-section sc-apply" id="founding-hosts" aria-labelledby="founding-hosts-title">
          <div className="sc-wrap sc-apply__wrap">
            <div className="sc-apply__pitch">
              <p className="sc-kicker">Founding hosts</p>
              <h2 className="sc-title sc-apply__title" id="founding-hosts-title">
                Run your school&apos;s Senior Assassin game?
              </h2>
              <p className="sc-text">
                Become a founding host. You get a cut of every sale from your school, and your players get a discount. Zero
                work: we ship everything to you in one box.
              </p>
            </div>
            <div className="sc-card sc-apply__card">
              <HostForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="sc-footer">
        <a className="sc-footer__ig" href={`https://www.instagram.com/${INSTAGRAM}/`} target="_blank" rel="noopener noreferrer">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          </svg>
          <span>@{INSTAGRAM}</span>
        </a>
        <p className="sc-footer__copy">&copy; {2026} Splashy Cam</p>
      </footer>
    </>
  );
}

function Placeholder({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="sc-placeholder" role="img" aria-label={`${label} (placeholder)`}>
      <span>
        {label}
        <small>{hint}</small>
      </span>
    </div>
  );
}
