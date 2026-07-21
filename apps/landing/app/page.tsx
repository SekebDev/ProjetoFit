import { BarbellExplode } from "@/components/sections/BarbellExplode";
import { Features } from "@/components/sections/Features";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { RackieSection } from "@/components/sections/RackieSection";
import { StatsStrip } from "@/components/sections/StatsStrip";
import { PlateDivider } from "@/components/ui/PlateDivider";

export default function Home() {
  return (
    <>
      <main className="flex-1">
        <Hero />
        <BarbellExplode />
        <Features />
        <PlateDivider />
        <StatsStrip />
        <PlateDivider />
        <RackieSection />
        <PlateDivider />
        <HowItWorks />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
