import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
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
      <body className="relative flex min-h-svh flex-col">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
