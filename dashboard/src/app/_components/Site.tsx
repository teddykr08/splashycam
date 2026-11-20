import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";

// Files in dashboard/public/. Until they exist, labeled placeholders show.
export const CLIP = "launch-clip.mp4"; // tall 9:16 works best; plays muted on a loop
// Header logo: logo.png if present (e.g. a transparent one), else logo.jpg, else a placeholder.
export const LOGO_FILES = ["logo.png", "logo.jpg"] as const;
export const INSTAGRAM = "splashycam.shop";

const inPublic = (file: string) => existsSync(path.join(process.cwd(), "public", file));

export function Logo({ href }: { href?: string }) {
  const logo = LOGO_FILES.find(inPublic);
  const img = logo ? (
    // A plain img keeps any logo size/format working without config.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/${logo}`} alt="Splashy Cam" className="sc-logo__img" />
  ) : (
    <Placeholder label="Your logo" hint="dashboard/public/logo.png" />
  );
  return (
    <div className="sc-logo">
      {href ? (
        <Link href={href} aria-label="Splashy Cam home">
          {img}
        </Link>
      ) : (
        img
      )}
    </div>
  );
}

export function Clip({ small = false }: { small?: boolean }) {
  return (
    <div className={`sc-card sc-clip${small ? " sc-clip--small" : ""}`}>
      {inPublic(CLIP) ? (
        <video src={`/${CLIP}`} autoPlay loop muted playsInline preload="metadata" aria-label="Splashy Cam in action" />
      ) : (
        <Placeholder label="Your clip" hint={`dashboard/public/${CLIP}`} />
      )}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="sc-footer">
      <a className="sc-footer__ig" href={`https://www.instagram.com/${INSTAGRAM}/`} target="_blank" rel="noopener noreferrer">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
        <span>{`@${INSTAGRAM}`}</span>
      </a>
      <p className="sc-footer__copy">&copy; 2026 Splashy Cam</p>
    </footer>
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
