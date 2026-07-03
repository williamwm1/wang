import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "痛点搜集器 Pain Radar",
  description: "从用户评论中发现真实市场痛点与产品机会",
};

// 首次渲染前应用已保存的主题，避免闪烁；默认浅色
const themeScript = `
try {
  if (localStorage.getItem("pain-radar-theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
        <footer className="border-t border-line py-4 text-center text-xs text-muted">
          痛点搜集器 Pain Radar · 从真实评论中发现值得做的产品机会
        </footer>
      </body>
    </html>
  );
}
