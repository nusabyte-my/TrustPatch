import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/geist-mono/400.css";
import "./globals.css";
import "./landing.css";
import "./agent-command.css";
import "./mission.css";
import "./workflow.css";
import "./seo-operations.css";
import "./theme.css";

export const metadata: Metadata = { title: "TrustPatch — Watch a real repair happen", description: "Give Mend a website target. Inspect evidence, approve an isolated repair, and verify the result." };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to repair workbench</a>{children}</body></html>;
}
