import { prisma } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { OpportunityCard } from "@/components/OpportunityCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "机会雷达 · Pain Radar" };

interface Filters {
  industry?: string;
  targetUser?: string;
  painType?: string;
  platform?: string;
  minScore?: string;
  payment?: string;
  aiFit?: string;
}

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  await ensureSeeded();
  const f = await searchParams;

  const clusters = await prisma.cluster.findMany({
    orderBy: { totalScore: "desc" },
    include: {
      comments: {
        orderBy: { painSeverityScore: "desc" },
        select: { rawText: true, sourcePlatform: true },
      },
    },
  });

  // 筛选选项（从现有数据中取）
  const industries = [...new Set(clusters.map((c) => c.industry))].sort();
  const users = [...new Set(clusters.map((c) => c.targetUser))].sort();
  const painTypes = [...new Set(clusters.map((c) => c.painType))].sort();
  const platforms = [...new Set(clusters.flatMap((c) => c.comments.map((x) => x.sourcePlatform)))].sort();

  const minScore = f.minScore ? parseInt(f.minScore, 10) : 0;
  const filtered = clusters.filter((c) => {
    if (f.industry && c.industry !== f.industry) return false;
    if (f.targetUser && c.targetUser !== f.targetUser) return false;
    if (f.painType && c.painType !== f.painType) return false;
    if (f.platform && !c.comments.some((x) => x.sourcePlatform === f.platform)) return false;
    if (minScore > 0 && c.totalScore < minScore) return false;
    if (f.payment === "1" && c.paymentSignalScore < 8) return false;
    if (f.aiFit === "1" && c.aiAutomationFitScore < 10) return false;
    return true;
  });

  const hasFilter = Boolean(
    f.industry || f.targetUser || f.painType || f.platform || minScore || f.payment || f.aiFit
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">机会雷达</h1>
        <p className="text-sm text-muted mt-0.5">
          相似痛点评论自动聚合成的市场机会，按总分排序（痛点强度 25 + 频率 20 + 付费信号 15 + 软件适配 15 + AI 适配 15 + 方案缺口 10）
        </p>
      </div>

      {/* 筛选行 */}
      <form method="GET" className="rounded-xl border border-line bg-surface p-3 flex flex-wrap items-end gap-2 text-sm">
        <Select name="industry" label="行业" value={f.industry} options={industries} />
        <Select name="targetUser" label="用户类型" value={f.targetUser} options={users} />
        <Select name="painType" label="痛点类型" value={f.painType} options={painTypes} />
        <Select name="platform" label="来源平台" value={f.platform} options={platforms} />
        <label>
          <span className="block text-xs text-muted mb-1">最低分数</span>
          <select name="minScore" defaultValue={f.minScore ?? ""} className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5">
            <option value="">不限</option>
            <option value="70">≥ 70（高价值）</option>
            <option value="50">≥ 50</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 pb-2">
          <input type="checkbox" name="payment" value="1" defaultChecked={f.payment === "1"} />
          <span className="text-xs text-secondary">有付费信号</span>
        </label>
        <label className="flex items-center gap-1.5 pb-2">
          <input type="checkbox" name="aiFit" value="1" defaultChecked={f.aiFit === "1"} />
          <span className="text-xs text-secondary">适合 AI 自动化</span>
        </label>
        <button className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:opacity-90">
          筛选
        </button>
        {hasFilter && (
          <a href="/radar" className="text-xs text-muted hover:text-foreground pb-2">
            清除筛选
          </a>
        )}
      </form>

      <p className="text-xs text-muted">
        共 {filtered.length} 个机会{hasFilter ? `（已从 ${clusters.length} 个中筛选）` : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">
          当前筛选条件下没有机会。试试放宽条件，或先到「导入分析」添加更多评论。
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <OpportunityCard key={c.id} cluster={c} quote={c.comments[0]?.rawText} />
          ))}
        </div>
      )}
    </div>
  );
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: string[];
}) {
  return (
    <label>
      <span className="block text-xs text-muted mb-1">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 max-w-36">
        <option value="">全部</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
