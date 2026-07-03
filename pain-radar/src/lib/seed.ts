import { prisma } from "@/lib/db";
import { analyzeWithRules } from "@/lib/analyzer/rules";
import { reclusterAll } from "@/lib/cluster";
import { DEMO_COMMENTS } from "@/lib/demo-data";

const DAY = 24 * 60 * 60 * 1000;

/** 清空数据库并写入 Demo 数据（用规则分析器生成结构化结果，再聚类评分） */
export async function seedDemoData() {
  await prisma.comment.deleteMany();
  await prisma.cluster.deleteMany();

  const now = Date.now();
  for (const demo of DEMO_COMMENTS) {
    const analysis = analyzeWithRules(demo.text);
    const ts = new Date(now - demo.daysAgo * DAY);
    await prisma.comment.create({
      data: {
        rawText: demo.text,
        sourcePlatform: demo.platform,
        authorName: demo.author,
        language: demo.language,
        publishedAt: ts,
        importedAt: ts,
        isPainPoint: analysis.isPainPoint,
        painType: analysis.painType,
        targetUser: analysis.targetUser,
        userScenario: analysis.userScenario,
        jobToBeDone: analysis.jobToBeDone,
        currentWorkaround: analysis.currentWorkaround,
        painDescription: analysis.painDescription,
        painSeverityScore: analysis.painSeverityScore,
        paymentSignalScore: analysis.paymentSignalScore,
        softwareFitScore: analysis.softwareFitScore,
        aiAutomationFitScore: analysis.aiAutomationFitScore,
        summary: analysis.summary,
        recommendedSolutionDirection: analysis.recommendedSolutionDirection,
        topicKey: analysis.topicKey,
      },
    });
  }

  const clusterCount = await reclusterAll();
  const commentCount = await prisma.comment.count();
  return { commentCount, clusterCount };
}

/** 数据库为空时自动填充 Demo 数据（保证首页永远不为空） */
export async function ensureSeeded() {
  const count = await prisma.comment.count();
  if (count === 0) {
    console.log("[pain-radar] 数据库为空，自动写入 Demo 数据…");
    await seedDemoData();
  }
}
