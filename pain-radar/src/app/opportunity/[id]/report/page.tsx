import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildReportMarkdown } from "@/lib/report";
import { CopyButton } from "@/components/CopyButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "研究报告 · Pain Radar" };

export default async function ReportPage({
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

  const markdown = buildReportMarkdown(cluster, cluster.comments);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/opportunity/${cluster.id}`} className="text-sm text-muted hover:text-foreground">
          ← 返回机会详情
        </Link>
        <div className="ml-auto">
          <CopyButton text={markdown} label="⧉ 复制报告 Markdown" />
        </div>
      </div>

      <article className="rounded-xl border border-line bg-surface p-6">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-secondary">
          {markdown}
        </pre>
      </article>

      <p className="text-xs text-muted">
        报告由模板 + 已收集数据自动生成，未调用外部 AI；配置 API Key 后逐条评论的分析将由真实模型完成。
      </p>
    </div>
  );
}
