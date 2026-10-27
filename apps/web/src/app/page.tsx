import { LandingHero } from "../components/landing-hero";
import { getLatestImpactCase } from "../server/impact";
export const dynamic = "force-dynamic";

export default function Home() {
  return <LandingHero impact={getLatestImpactCase()} />;
}
