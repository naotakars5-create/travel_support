import type { Metadata } from "next";
import { Zen_Old_Mincho, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const zenOldMincho = Zen_Old_Mincho({
  variable: "--font-mincho",
  weight: ["400", "600", "700", "900"],
  subsets: ["latin"],
  preload: false,
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-gothic",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "TABI-NAVI / 旅ナビ",
  description: "予約確認メールから1日の旅程を組み、当日は次の予定だけを示す旅行支援アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${zenOldMincho.variable} ${notoSansJP.variable} h-full`}>
      <body className="h-full font-gothic antialiased">{children}</body>
    </html>
  );
}
