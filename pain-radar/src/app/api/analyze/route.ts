import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeComments } from "@/lib/analyzer/provider";
import { reclusterAll } from "@/lib/cluster";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

interface AnalyzeBody {
  platform?: string;
  language?: string; // auto / zh / en
  texts?: string[];
}

function detectLanguage(text: string): string {
  return /[一-鿿]/.test(text) ? "zh" : "en";
}

export async function POST(req: Request) {
  await ensureSeeded();

  let body: AnalyzeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const platform = (body.platform ?? "").trim() || "产品评论";
  const languageChoice = body.language ?? "auto";
  const texts = (body.texts ?? [])
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean)
    .slice(0, 200);

  if (texts.length === 0) {
    return NextResponse.json({ error: "没有可分析的评论文本" }, { status: 400 });
  }

  const { results, provider } = await analyzeComments(texts);

  const now = new Date();
  const saved = [];
  for (let i = 0; i < texts.length; i++) {
    const r = results[i];
    const comment = await prisma.comment.create({
      data: {
        rawText: texts[i],
        sourcePlatform: platform,
        language: languageChoice === "auto" ? detectLanguage(texts[i]) : languageChoice,
        importedAt: now,
        publishedAt: now,
        isPainPoint: r.isPainPoint,
        painType: r.painType,
        targetUser: r.targetUser,
        userScenario: r.userScenario,
        jobToBeDone: r.jobToBeDone,
        currentWorkaround: r.currentWorkaround,
        painDescription: r.painDescription,
        painSeverityScore: r.painSeverityScore,
        paymentSignalScore: r.paymentSignalScore,
        softwareFitScore: r.softwareFitScore,
        aiAutomationFitScore: r.aiAutomationFitScore,
        summary: r.summary,
        recommendedSolutionDirection: r.recommendedSolutionDirection,
        topicKey: r.topicKey,
      },
    });
    saved.push({ id: comment.id, text: texts[i], ...r });
  }

  // 保存后自动重新聚类 + 更新机会评分
  await reclusterAll();

  // 带回每条评论最终归入的机会簇，方便前端跳转
  const withCluster = await prisma.comment.findMany({
    where: { id: { in: saved.map((s) => s.id) } },
    include: { cluster: { select: { id: true, title: true, totalScore: true } } },
  });
  const clusterById = new Map(withCluster.map((c) => [c.id, c.cluster]));

  return NextResponse.json({
    provider,
    results: saved.map((s) => ({ ...s, cluster: clusterById.get(s.id) ?? null })),
  });
}
