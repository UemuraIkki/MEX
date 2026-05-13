import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MEX",
  description: "Mpoint Exchange",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950`}>
        {children}
        {/* ボトムナビ */}
        <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-gray-950 flex">
          <a href="/market" className="flex-1 py-3 text-center text-xs text-gray-500 hover:text-white transition-colors">
            MARKET
          </a>
          <a href="/portfolio" className="flex-1 py-3 text-center text-xs text-gray-500 hover:text-white transition-colors">
            PORTFOLIO
          </a>
        </nav>
      </body>
    </html>
  );
}
