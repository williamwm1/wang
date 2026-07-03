"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResetDemoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (!confirm("将清空当前所有数据并恢复初始 Demo 数据，确定吗？")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      alert("重置失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={reset}
      disabled={busy}
      className="rounded-lg border border-line px-3 py-1.5 text-xs text-secondary hover:bg-surface-2 disabled:opacity-50 transition-colors"
    >
      {busy ? "重置中…" : "↺ 重置 Demo 数据"}
    </button>
  );
}
