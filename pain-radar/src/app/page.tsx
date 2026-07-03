import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { TrendChart } from "@/components/TrendChart";
import { OpportunityCard } from "@/components/OpportunityCard";
import { ResetDemoButton } from "@/components/ResetDemoButton";
import { PainBadge, PlatformTag } from "@/components/badges";

export const dynamic = "force-dynamic";

const HOT_WORDS = [
  "手动", "每天", "浪费时间", "漏", "混乱", "重复", "表格", "Excel", "找不到",
  "多个平台", "太麻烦", "愿意付费", "有没有工具", "出错", "提醒", "自动",
  "截止日期", "客户", "后台", "整理",
];

export default async function Dashboard() {
  await ensureSeeded();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [todayCount, painCount, clusterCount, highValueCount, topClusters, recentComments, painComments] =
    await Promise.all([
      prisma.comment.count({ where: { importedAt: { gte: startOfToday } } }),
      prisma.comment.count({ where: { isPainPoint: true } }),
      prisma.cluster.count(),
      prisma.cluster.count({ where: { totalScore: { gte: 70 } } }),
      prisma.cluster.findMany({
        orderBy: { totalScore: "desc" },
        take: 6,
        include: {
          comments: { orderBy: { painSeverityScore: "desc" }, take: 1, select: { rawText: true } },
        },
      }),
      prisma.comment.findMany({ orderBy: { importedAt: "desc" }, take: 6 }),
      prisma.comment.findMany({ where: { isPainPoint: true }, select: { rawText: true } }),
    ]);

  // 最近 7 天每日新增评论
  const DAY = 24 * 60 * 60 * 1000;
  const allRecent = await prisma.comment.findMany({
    where: { importedAt: { gte: new Date(startOfToday.getTime() - 6 * DAY) } },
    select: { importedAt: true },
  });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfToday.getTime() - (6 - i) * DAY);
    const next = new Date(d.getTime() + DAY);
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      count: allRecent.filter((c) => c.importedAt >= d && c.importedAt < next).length,
    };
  });

  // 高频痛点词
  const wordFreq = HOT_WORDS.map((w) => ({
    word: w,
    count: painComments.filter((c) => c.rawText.toLowerCase().includes(w.toLowerCase())).length,
  }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  const maxFreq = Math.max(1, ...wordFreq.map((w) => w.count));

  const stats = [
    { label: "今日分析评论", value: todayCount, hint: "条" },
    { label: "已识别痛点", value: painCount, hint: "条" },
    { label: "需求簇", value: clusterCount, hint: "个" },
    { label: "高价值机会", value: highValueCount, hint: "个 ≥70分" },
  ];

  return (
    <div className="space-y-6">
      {/* 顶部标题 + 主操作 */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">市场痛点总览</h1>
          <p className="text-sm text-muted mt-0.5">
            从评论、聊天记录和帖子里，找出人们反复抱怨、愿意花钱解决的问题
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ResetDemoButton />
          <Link
            href="/radar"
            className="rounded-lg border border-line px-3.5 py-1.5 text-sm text-secondary hover:bg-surface-2 transition-colors"
          >
            查看机会雷达
          </Link>
          <Link
            href="/import"
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            ＋ 导入评论并分析
          </Link>
        </div>
      </div>

      {/* 指标卡 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-surface p-4">
            <div className="text-xs text-muted">{s.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tabular-nums tracking-tight">{s.value}</span>
              <span className="text-xs text-muted">{s.hint}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 趋势图 + 高频词 */}
      <div className="grid lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 rounded-xl border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">最近 7 天 · 每日新增痛点评论</h2>
            <span className="text-xs text-muted">悬停查看数值</span>
          </div>
          <div className="mt-3">
            <TrendChart days={days} />
          </div>
        </div>
        <div className="lg:col-span-2 rounded-xl border border-line bg-surface p-4">
          <h2 className="text-sm font-medium">高频痛点词</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {wordFreq.map((w) => (
              <span
                key={w.word}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-secondary"
                style={{ fontSize: `${12 + (w.count / maxFreq) * 6}px` }}
              >
                {w.word}
                <span className="text-[10px] text-muted tabular-nums">{w.count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Top 机会 */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-medium">Top 高价值机会</h2>
          <Link href="/radar" className="text-xs text-accent hover:underline">
            全部机会 →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {topClusters.map((c) => (
            <OpportunityCard key={c.id} cluster={c} quote={c.comments[0]?.rawText} />
          ))}
        </div>
      </section>

      {/* 最近导入 */}
      <section>
        <h2 className="font-medium mb-3">最近导入的评论</h2>
        <div className="rounded-xl border border-line bg-surface divide-y divide-[var(--border)]">
          {recentComments.map((c) => (
            <div key={c.id} className="flex items-start gap-3 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-secondary line-clamp-2">{c.rawText}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <PlatformTag platform={c.sourcePlatform} />
                  {c.authorName && <span>{c.authorName}</span>}
                  <span>{c.importedAt.toLocaleDateString("zh-CN")}</span>
                </div>
              </div>
              <PainBadge isPain={c.isPainPoint} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
