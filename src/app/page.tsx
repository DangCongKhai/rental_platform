import { Areas } from "@/components/home/areas";
import { Faq } from "@/components/home/faq";
import { Features } from "@/components/home/features";
import { Hero } from "@/components/home/hero";
import { LatestListings } from "@/components/home/latest-listings";
import { OwnerCta } from "@/components/home/owner-cta";
import { Steps } from "@/components/home/steps";
import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/site-footer";

export default function Home() {
  return (
    <div className="relative flex min-h-svh flex-col bg-white">
      <div className="absolute inset-x-0 top-0 z-30">
        <Navbar transparent />
      </div>
      <main>
        <Hero />
        <Features />
        <LatestListings />
        <Areas />
        <Steps />
        <OwnerCta />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}
