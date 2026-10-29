import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website maintenance services",
  description: "Clear scopes and verified website repairs.",
  alternates: { canonical: "https://staging.northstar.example/services" },
  robots: { index: false, follow: false }
};

export default function Services() {
  return <main><p className="eyebrow">Services</p><h1>Repairs with evidence.</h1><article><h2>Technical website review</h2><p>We inspect indexing, metadata, and production configuration, then explain what needs attention.</p></article><article><h2>Ongoing maintenance</h2><p>Small, reviewed changes with explicit before-and-after verification.</p></article></main>;
}
