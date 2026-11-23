"use client";

import { useState } from "react";

/** The host's share link with a big copy button. Falls back to selecting the text. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.getElementById("share-link") as HTMLInputElement | null;
      input?.select();
    }
  }

  return (
    <div className="sc-copy">
      <label className="sr-only" htmlFor="share-link">
        Your share link
      </label>
      <input id="share-link" className="sc-field sc-copy__url" value={url} readOnly onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="sc-btn sc-btn--wide" onClick={copy}>
        {copied ? "Copied!" : "Copy link"}
      </button>
      <p className="sr-only" aria-live="polite">
        {copied ? "Link copied" : ""}
      </p>
    </div>
  );
}
