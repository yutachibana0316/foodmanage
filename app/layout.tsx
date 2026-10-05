import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "食事管理ノート",
  description: "体重・体脂肪・食事・消費カロリーを毎日記録して、グラフで振り返るアプリ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f4f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <span className="brand">食事管理ノート</span>
            <Nav />
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
