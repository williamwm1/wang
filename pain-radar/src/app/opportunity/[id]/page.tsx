import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LevelBadge, MiniScore, PainBadge, PlatformTag, TrendBadge } from "@/components/badges";
import { CopyButton } from "@/components/CopyButton";
import { buildSummaryText, parseExplanation } from "@/lib/report";

export const dynamic = "force-dynamic";

export default async function OpportunityDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cluster = await prisma.cluster.findUnique({
    where: { id },
    include: { comments: { orderBy: { painSeverityScore: "desc" } } },
  });
  if (!cluster) notFound();

  const explanation = parseExplanation(cluster);
  const dims = [
    { label: "痛点强度", score: cluster.painIntensityScore, max: 25 },
    { label: "出现频率", score: cluster.frequencyScore, max: 20 },
    { label: "付费信号", score: cluster.paymentSignalScore, max: 15 },
    { label: "软件可解决性", score: cluster.softwareFitScore, max: 15 },
    { label: "AI 自动化适配", score: cluster.aiAutomationFitScore, max: 15 },
    { label: "现有方案不足", score: cluster.solutionGapScore, max: 10 },
  ];

  return (
    <div className="space-y-5">
      <Link href="/radar" className="text-sm text-muted hover:text-foreground">
        ← 返回机会雷达
      </Link>

      {/* 头部 */}
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-64">
            <div className="flex flex-wrap items-center gap-2">
              <LevelBadge score={cluster.totalScore} />
              <TrendBadge trend={cluster.trendStatus} />
              <span className="text-xs text-muted">
                {cluster.industry} · {cluster.painType}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{cluster.title}</h1>
            <p className="mt-2 text-sm text-secondary">{cluster.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton text={buildSummaryText(cluster)} label="⧉ 复制机会摘要" />
              <Link
                href={`/opportunity/${cluster.id}/report`}
                className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                ⚡ 生成研究报告
              </Link>
            </div>
          </div>
          <div className="text-center rounded-xl bg-surface-2 px-6 py-4">
            <div className="text-4xl font-semibold tabular-nums">{cluster.totalScore}</div>
            <div className="text-xs text-muted mt-1">机会总分 / 100</div>
            <div className="mt-1 text-xs text-muted">
              {cluster.commentCount} 条评论 · {cluster.sourceCount} 个平台
            </div>
          </div>
        </div>
      </div>

      {/* 关键信息 */}
      <div className="grid md:grid-cols-2 gap-3">
        <InfoCard title="目标用户与场景">
          <Item label="目标用户" value={cluster.targetUser} />
          <Item label="用户场景" value={cluster.comments[0]?.userScenario ?? "—"} />
          <Item label="核心痛点" value={cluster.painDescription} />
          <Item label="当前替代方案" value={cluster.currentWorkaround} />
        </InfoCard>
        <InfoCard title="产品建议">
          <Item label="推荐产品方向" value={cluster.recommendedProductDirection} />
          <Item label="可能的 MVP" value={cluster.suggestedMvp} />
          <Item label="商业模式建议" value={cluster.suggestedBusinessModel} />
          <Item label="风险提示" value={cluster.riskNotes} />
        </InfoCard>
      </div>

      {/* 评分解释 */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <h2 className="font-medium mb-3">为什么评分是 {cluster.totalScore} 分</h2>
        <div className="space-y-3">
          {dims.map((d) => {
            const exp = explanation.find((e) => e.dimension === d.label);
            return (
              <div key={d.label}>
                <div className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm text-secondary">{d.label}</span>
                  <div className="h-2 flex-1 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(d.score / d.max) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-sm font-medium tabular-nums">
                    {d.score} / {d.max}
                  </span>
                </div>
                {exp && <p className="mt-1 text-xs text-muted sm:pl-[7.75rem]">{exp.reason}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 原始评论证据 */}
      <section>
        <h2 className="font-medium mb-3">原始评论证据（{cluster.comments.length} 条）</h2>
        <div className="space-y-3">
          {cluster.comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-start gap-3">
                <p className="flex-1 text-sm leading-relaxed">“{c.rawText}”</p>
                <PainBadge isPain={c.isPainPoint} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <PlatformTag platform={c.sourcePlatform} />
                {c.authorName && <span>{c.authorName}</span>}
                <span>{(c.publishedAt ?? c.importedAt).toLocaleDateString("zh-CN")}</span>
                {c.sourceUrl ? (
                  <a href={c.sourceUrl} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                    原链接 ↗
                  </a>
                ) : (
                  <span className="text-muted/70">原链接：未提供</span>
                )}
              </div>
              <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                <MiniScore label="痛点严重度" value={c.painSeverityScore} />
                <MiniScore label="付费信号" value={c.paymentSignalScore} />
                <MiniScore label="软件适配度" value={c.softwareFitScore} />
                <MiniScore label="AI 自动化适配" value={c.aiAutomationFitScore} />
              </div>
              {c.summary && (
                <p className="mt-2 text-xs text-muted">
                  <span className="text-muted/80">AI 分析：</span>
                  {c.summary}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <h2 className="font-medium mb-2.5">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-muted">{label}</span>
      <p className="mt-0.5 text-secondary">{value}</p>
    </div>
  );
}
