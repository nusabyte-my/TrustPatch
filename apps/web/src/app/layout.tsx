import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";

export const metadata: Metadata = { title: "TrustPatch — Repairs with proof", description: "Mend turns verified website findings into tested, human-approved repairs." };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to repair workbench</a>{children}</body></html>;
}
