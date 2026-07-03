import { opportunityLevel } from "@/lib/types";

export function LevelBadge({ score }: { score: number }) {
  const level = opportunityLevel(score);
  const styles =
    level === "高价值"
      ? "bg-[color-mix(in_srgb,var(--status-good)_12%,transparent)] text-[var(--status-good)]"
      : level === "值得观察"
        ? "bg-[color-mix(in_srgb,var(--status-warning)_16%,transparent)] text-[#8a6100] dark:text-[var(--status-warning)]"
        : "bg-surface-2 text-muted";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
      {level === "高价值" ? "◆" : level === "值得观察" ? "◇" : "·"} {level}
    </span>
  );
}

export function TrendBadge({ trend }: { trend: string }) {
  const map: Record<string, { icon: string; cls: string }> = {
    上升: { icon: "↑", cls: "text-[var(--status-good)]" },
    新出现: { icon: "✦", cls: "text-accent" },
    平稳: { icon: "→", cls: "text-muted" },
  };
  const t = map[trend] ?? map["平稳"];
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${t.cls}`}>
      {t.icon} {trend}
    </span>
  );
}

export function PlatformTag({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] text-secondary whitespace-nowrap">
      {platform}
    </span>
  );
}

export function PainBadge({ isPain }: { isPain: boolean }) {
  return isPain ? (
    <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--status-critical)_10%,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--status-critical)]">
      真实痛点
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
      非痛点
    </span>
  );
}

/** 0-10 的小分数条 */
export function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-muted">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.min(100, value * 10)}%` }}
        />
      </div>
      <span className="w-8 text-right font-medium tabular-nums">{value}/10</span>
    </div>
  );
}
