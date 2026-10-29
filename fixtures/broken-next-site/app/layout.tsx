import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3100"),
  title: "Northstar Web Operations",
  description: "Independent website maintenance for growing teams.",
  // Deliberate inherited defect: page-only repairs must verify and find this.
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
