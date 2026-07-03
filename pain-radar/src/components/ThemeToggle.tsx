"use client";

import { useState } from "react";

export function ThemeToggle() {
  // SSR 阶段渲染浅色图标；客户端首次渲染读取 <html> 上已由内联脚本设置的主题
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("pain-radar-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      suppressHydrationWarning
      aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
      className="h-8 w-8 rounded-full border border-line text-sm text-secondary hover:bg-surface-2 transition-colors"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
