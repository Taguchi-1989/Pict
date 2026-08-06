import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ピクトポーズ｜作業マニュアル向けピクトグラム編集",
  description: "基本姿勢を選び、関節をドラッグして微調整。SVG・PNGで保存できる無料の人物ピクトグラムエディタ。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
