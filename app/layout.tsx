import type { Metadata, Viewport } from "next";
import { brandColors } from "./brand-geometry";
import "./globals.css";

/**
 * SNSやチャットに貼ったときのサムネイル（OGP画像）は絶対URLでないと読まれないため、
 * 公開先のURLをビルド時に渡す。Cloudflareの環境変数に NEXT_PUBLIC_SITE_URL を設定する。
 * 未設定のままだと下の既定値のURLで書き出されるので、独自ドメインを付けたら必ず設定すること。
 */
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pict2.workers.dev").replace(/\/$/, "");

const title = "ピクトポーズ｜作業マニュアル向けピクトグラム編集";
const description = "基本姿勢を選び、関節をドラッグして微調整。SVG・PNGで保存できる無料の人物ピクトグラムエディタ。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s｜ピクトポーズ",
  },
  description,
  applicationName: "ピクトポーズ",
  keywords: ["ピクトグラム", "作業手順書", "作業マニュアル", "安全教育", "SVG", "人物図", "ピクトポーズ"],
  alternates: { canonical: "/" },
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "ピクトポーズ", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "ピクトポーズ",
    url: "/",
    title,
    description,
    images: [{
      url: "/ogp.png",
      width: 1200,
      height: 630,
      type: "image/png",
      alt: "ピクトポーズ｜作業マニュアルの人物ピクトグラムを、関節をドラッグして作る",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/ogp.png"],
  },
};

export const viewport: Viewport = {
  themeColor: brandColors.ink,
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
