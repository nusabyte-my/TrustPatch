import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: true, follow: true } };

export default function Home() {
  return <main><p className="eyebrow">Northstar Web Operations</p><h1>Websites kept useful.</h1><p>Maintenance, technical review, and careful repairs for independent businesses.</p><nav aria-label="Services"><Link href="/services">View services</Link><Link href="/blog">Field notes</Link></nav></main>;
}
