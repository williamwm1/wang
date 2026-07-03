import { prisma } from "@/lib/db";
import { findTopic, GENERIC_TOPIC } from "@/lib/analyzer/topics";
import type { ScoreExplanationItem } from "@/lib/types";

// 轻量聚类：
//   1. 优先按分析器给出的 topicKey 聚（预置机会方向）
//   2. 没有 topicKey 的评论，按 painType + targetUser 聚
// 每次导入后全量重算所有簇的评分，保证首页/雷达页数据同步。

function clusterKeyFor(c: { topicKey: string | null; painType: string | null; targetUser: string | null; isPainPoint: boolean }): string | null {
  if (!c.isPainPoint) return null;
  if (c.topicKey) return c.topicKey;
  return `generic:${c.painType ?? "未知"}:${c.targetUser ?? "未知"}`;
}

const MANUAL_WORKAROUND_HINTS = ["Excel", "excel", "表格", "手动", "人工", "手工", "纸", "登记本", "备忘录", "记忆"];

interface MemberComment {
  id: string;
  rawText: string;
  sourcePlatform: string;
  currentWorkaround: string | null;
  painSeverityScore: number;
  paymentSignalScore: number;
  softwareFitScore: number;
  aiAutomationFitScore: number;
  importedAt: Date;
  publishedAt: Date | null;
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export function computeClusterScores(members: MemberComment[]) {
  const severityAvg = avg(members.map((m) => m.painSeverityScore));
  const paymentAvg = avg(members.map((m) => m.paymentSignalScore));
  const softwareAvg = avg(members.map((m) => m.softwareFitScore));
  const aiAvg = avg(members.map((m) => m.aiAutomationFitScore));
  const sources = new Set(members.map((m) => m.sourcePlatform));
  const strongPaymentCount = members.filter((m) => m.paymentSignalScore >= 6).length;
  const manualCount = members.filter((m) =>
    MANUAL_WORKAROUND_HINTS.some((w) => (m.currentWorkaround ?? "").includes(w) || m.rawText.includes(w))
  ).length;

  // 痛点强度 25 分
  const painIntensityScore = Math.round((severityAvg / 10) * 25);
  // 出现频率 20 分：评论数 + 来源平台数
  const frequencyScore = Math.min(20, Math.round(members.length * 1.6 + sources.size * 1.6));
  // 付费信号 15 分
  const paymentSignalScore = Math.min(15, Math.round((paymentAvg / 10) * 12 + strongPaymentCount));
  // 软件可解决性 15 分
  const softwareFitScore = Math.round((softwareAvg / 10) * 15);
  // AI 自动化适配度 15 分
  const aiAutomationFitScore = Math.round((aiAvg / 10) * 15);
  // 现有方案不足 10 分：现有替代方案越“手工”，分越高
  const solutionGapScore = Math.min(10, 5 + Math.round((manualCount / Math.max(1, members.length)) * 5));

  const totalScore =
    painIntensityScore + frequencyScore + paymentSignalScore + softwareFitScore + aiAutomationFitScore + solutionGapScore;

  const explanation: ScoreExplanationItem[] = [
    {
      dimension: "痛点强度", score: painIntensityScore, max: 25,
      reason: `相关评论的平均痛点严重度为 ${severityAvg.toFixed(1)}/10，评论中反复出现“每天”“手动”“漏掉”“很麻烦”等强痛点表达。`,
    },
    {
      dimension: "出现频率", score: frequencyScore, max: 20,
      reason: `该类问题共收集到 ${members.length} 条相关评论，来自 ${sources.size} 个来源平台。`,
    },
    {
      dimension: "付费信号", score: paymentSignalScore, max: 15,
      reason: strongPaymentCount > 0
        ? `其中 ${strongPaymentCount} 条评论明确表达希望购买工具或愿意付费解决。`
        : `暂未出现明确付费表达，付费意愿主要来自“寻找工具”类诉求的间接信号。`,
    },
    {
      dimension: "软件可解决性", score: softwareFitScore, max: 15,
      reason: `该问题可以通过信息整合、提醒、自动化和工作流工具明显改善（平均适配度 ${softwareAvg.toFixed(1)}/10）。`,
    },
    {
      dimension: "AI 自动化适配度", score: aiAutomationFitScore, max: 15,
      reason: `评论分类、数据汇总、提醒生成、任务识别等环节都可以由 AI 自动完成（平均适配度 ${aiAvg.toFixed(1)}/10）。`,
    },
    {
      dimension: "现有方案不足", score: solutionGapScore, max: 10,
      reason: manualCount > 0
        ? `${manualCount} 条评论提到目前仍靠 Excel、表格、纸质记录或人工记忆处理，现有替代方案明显不足。`
        : `现有替代方案信息较少，按通用水平估计。`,
    },
  ];

  return {
    painIntensityScore, frequencyScore, paymentSignalScore,
    softwareFitScore, aiAutomationFitScore, solutionGapScore,
    totalScore, explanation,
    sourceCount: sources.size, commentCount: members.length,
  };
}

function computeTrend(members: MemberComment[], clusterCreatedAt: Date | null): string {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const dateOf = (m: MemberComment) => (m.publishedAt ?? m.importedAt).getTime();
  const recent = members.filter((m) => now - dateOf(m) <= 7 * DAY).length;
  const older = members.filter((m) => now - dateOf(m) > 7 * DAY).length;
  const isNew = !clusterCreatedAt || now - clusterCreatedAt.getTime() <= 3 * DAY;
  if (isNew && older === 0) return "新出现";
  if (recent > older) return "上升";
  return "平稳";
}

/** 全量重聚类 + 重算评分。返回受影响的簇数量 */
export async function reclusterAll(): Promise<number> {
  const comments = await prisma.comment.findMany();

  // 1. 分组
  const groups = new Map<string, typeof comments>();
  for (const c of comments) {
    const key = clusterKeyFor(c);
    if (!key) continue;
    const arr = groups.get(key) ?? [];
    arr.push(c);
    groups.set(key, arr);
  }

  // 2. 逐组 upsert 簇并回写评论关联
  const keptClusterIds: string[] = [];
  for (const [key, members] of groups) {
    const topic = findTopic(key);
    const first = members[0];
    const meta = topic ?? {
      ...GENERIC_TOPIC,
      title: `${first.targetUser ?? "用户"}的「${first.painType ?? "待归类"}」类痛点`,
      targetUser: first.targetUser ?? GENERIC_TOPIC.targetUser,
      painType: first.painType ?? GENERIC_TOPIC.painType,
      painDescription: first.painDescription ?? GENERIC_TOPIC.painDescription,
      currentWorkaround: first.currentWorkaround ?? GENERIC_TOPIC.currentWorkaround,
      recommendedProductDirection: first.recommendedSolutionDirection ?? GENERIC_TOPIC.recommendedProductDirection,
      summary: first.summary ?? GENERIC_TOPIC.summary,
    };

    const scores = computeClusterScores(members);
    const existing = await prisma.cluster.findUnique({ where: { key } });
    const trendStatus = computeTrend(members, existing?.createdAt ?? null);

    const data = {
      title: meta.title,
      summary: meta.summary,
      targetUser: meta.targetUser,
      industry: meta.industry,
      painType: meta.painType,
      painDescription: meta.painDescription,
      currentWorkaround: meta.currentWorkaround,
      recommendedProductDirection: meta.recommendedProductDirection,
      suggestedMvp: meta.suggestedMvp,
      suggestedBusinessModel: meta.suggestedBusinessModel,
      riskNotes: meta.riskNotes,
      totalScore: scores.totalScore,
      painIntensityScore: scores.painIntensityScore,
      frequencyScore: scores.frequencyScore,
      paymentSignalScore: scores.paymentSignalScore,
      softwareFitScore: scores.softwareFitScore,
      aiAutomationFitScore: scores.aiAutomationFitScore,
      solutionGapScore: scores.solutionGapScore,
      scoreExplanation: JSON.stringify(scores.explanation),
      trendStatus,
      sourceCount: scores.sourceCount,
      commentCount: scores.commentCount,
    };

    const cluster = existing
      ? await prisma.cluster.update({ where: { key }, data })
      : await prisma.cluster.create({ data: { key, ...data } });
    keptClusterIds.push(cluster.id);

    await prisma.comment.updateMany({
      where: { id: { in: members.map((m) => m.id) } },
      data: { clusterId: cluster.id },
    });
  }

  // 3. 清理已无成员的簇
  await prisma.cluster.deleteMany({ where: { id: { notIn: keptClusterIds } } });

  return keptClusterIds.length;
}
