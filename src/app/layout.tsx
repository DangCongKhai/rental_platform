import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { NavbarVisibility } from "@/components/layout/navbar-visibility";
import {
  FavouriteBoundary,
  FavouriteBoundaryFallback,
} from "@/contexts/favourite-boundary";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "rentOS · Nơi để ở. Chọn để thuộc về.",
  description: "Nền tảng thuê nhà dài hạn tại Đà Nẵng.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} h-full antialiased`}
      // Browser extensions (e.g. one sec) add attributes to <html> before hydration.
      suppressHydrationWarning
    >
      <body className="relative flex h-svh flex-col overflow-hidden">
        <Suspense fallback={null}>
          <NavbarVisibility>
            <Navbar />
          </NavbarVisibility>
        </Suspense>
        <div
          data-scroll-root
          className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          <Suspense
            fallback={
              <FavouriteBoundaryFallback>{children}</FavouriteBoundaryFallback>
            }
          >
            <FavouriteBoundary>{children}</FavouriteBoundary>
          </Suspense>
        </div>
      </body>
    </html>
  );
}
