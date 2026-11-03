import { SiteFooter } from "@/components/layout/site-footer";
import { HomePage } from "@/components/home/home-page";

export default function Home() {
  return (
    <div data-home className="relative flex min-h-svh flex-col bg-[#f0f4f7]">
      <main className="flex-1">
        <HomePage />
      </main>
      <SiteFooter />
    </div>
  );
}
