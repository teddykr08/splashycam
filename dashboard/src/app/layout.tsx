import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const display = Fredoka({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Nunito({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Splashy Cam",
  description: "A phone mount for any water gun. Film your kills hands free.",
  openGraph: {
    title: "Splashy Cam",
    description: "A phone mount for any water gun. Film your kills hands free.",
  },
};

export const viewport: Viewport = { themeColor: "#3BB4F2" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
