import Link from "next/link";
import type { Cluster } from "@/generated/prisma/client";
import { LevelBadge, TrendBadge } from "./badges";

export function OpportunityCard({
  cluster,
  quote,
}: {
  cluster: Cluster;
  quote?: string | null;
}) {
  return (
    <Link
      href={`/opportunity/${cluster.id}`}
      className="group flex flex-col rounded-xl border border-line bg-surface p-4 transition-all hover:border-accent hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-snug group-hover:text-accent transition-colors">
          {cluster.title}
        </h3>
        <div className="text-right shrink-0">
          <div className="text-2xl font-semibold tabular-nums leading-none">
            {cluster.totalScore}
          </div>
          <div className="text-[10px] text-muted mt-0.5">总分/100</div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <LevelBadge score={cluster.totalScore} />
        <TrendBadge trend={cluster.trendStatus} />
        <span className="text-xs text-muted">{cluster.targetUser}</span>
      </div>

      <p className="mt-2 text-sm text-secondary line-clamp-2">{cluster.painDescription}</p>

      {quote && (
        <p className="mt-2 text-xs text-muted italic line-clamp-2 border-l-2 border-line pl-2">
          “{quote}”
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-line grid grid-cols-4 gap-1 text-center text-[11px] text-muted">
        <div>
          <div className="text-sm font-medium text-foreground tabular-nums">{cluster.commentCount}</div>
          评论
        </div>
        <div>
          <div className="text-sm font-medium text-foreground tabular-nums">{cluster.sourceCount}</div>
          平台
        </div>
        <div>
          <div className="text-sm font-medium text-foreground tabular-nums">
            {cluster.softwareFitScore}/15
          </div>
          软件适配
        </div>
        <div>
          <div className="text-sm font-medium text-foreground tabular-nums">
            {cluster.aiAutomationFitScore}/15
          </div>
          AI 适配
        </div>
      </div>

      <div className="mt-3 text-xs text-secondary line-clamp-1">
        <span className="text-muted">推荐方向：</span>
        {cluster.recommendedProductDirection}
      </div>
      <div className="mt-2 text-xs font-medium text-accent">查看详情 →</div>
    </Link>
  );
}
