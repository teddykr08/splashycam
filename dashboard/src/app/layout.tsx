import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const display = Fredoka({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Nunito({ variable: "--font-body", subsets: ["latin"] });

// Link previews (Instagram DMs, iMessage): absolute URLs need metadataBase. The
// card image comes from opengraph-image.tsx / twitter-image.tsx next to each page.
export const metadata: Metadata = {
  metadataBase: new URL("https://www.splashycam.shop"),
  title: "Splashy Cam",
  description: "A phone mount for any water gun. Film your kills hands free.",
  openGraph: {
    type: "website",
    siteName: "Splashy Cam",
    url: "/",
    title: "Splashy Cam",
    description: "A phone mount for any water gun. Film your kills hands free.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Splashy Cam",
    description: "A phone mount for any water gun. Film your kills hands free.",
  },
};

export const viewport: Viewport = { themeColor: "#3BB4F2" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} antialiased`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
