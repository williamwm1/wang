import type { Cluster, Comment } from "@/generated/prisma/client";
import type { ScoreExplanationItem } from "@/lib/types";
import { opportunityLevel } from "@/lib/types";

export function parseExplanation(cluster: Cluster): ScoreExplanationItem[] {
  try {
    return JSON.parse(cluster.scoreExplanation) as ScoreExplanationItem[];
  } catch {
    return [];
  }
}

/** 机会摘要（用于"复制机会摘要"） */
export function buildSummaryText(cluster: Cluster): string {
  return [
    `【市场机会】${cluster.title}`,
    `等级：${opportunityLevel(cluster.totalScore)}（总分 ${cluster.totalScore}/100，趋势：${cluster.trendStatus}）`,
    `目标用户：${cluster.targetUser}`,
    `核心痛点：${cluster.painDescription}`,
    `当前替代方案：${cluster.currentWorkaround}`,
    `证据：${cluster.commentCount} 条相关评论，来自 ${cluster.sourceCount} 个平台`,
    `推荐产品方向：${cluster.recommendedProductDirection}`,
    `建议 MVP：${cluster.suggestedMvp}`,
    `商业模式：${cluster.suggestedBusinessModel}`,
    ``,
    `—— 由 痛点搜集器 Pain Radar 生成`,
  ].join("\n");
}

/** 完整研究报告（Markdown，纯模板 + 已有数据，无需调用 AI） */
export function buildReportMarkdown(cluster: Cluster, comments: Comment[]): string {
  const explanation = parseExplanation(cluster);
  const level = opportunityLevel(cluster.totalScore);
  const platforms = [...new Set(comments.map((c) => c.sourcePlatform))];
  const payComments = comments.filter((c) => c.paymentSignalScore >= 6);

  const lines: string[] = [
    `# 市场机会研究报告：${cluster.title}`,
    ``,
    `> 生成时间：${new Date().toLocaleString("zh-CN")} · 数据来源：${cluster.commentCount} 条用户原声（${platforms.join("、")}）`,
    ``,
    `## 一、结论速览`,
    ``,
    `- **机会等级**：${level}（总分 **${cluster.totalScore}/100**，趋势：${cluster.trendStatus}）`,
    `- **一句话痛点**：${cluster.painDescription}`,
    `- **目标用户**：${cluster.targetUser}`,
    `- **推荐产品方向**：${cluster.recommendedProductDirection}`,
    ``,
    `## 二、痛点与场景`,
    ``,
    `**用户场景**：${comments[0]?.userScenario ?? cluster.painDescription}`,
    ``,
    `**当前替代方案**：${cluster.currentWorkaround}`,
    ``,
    `**机会总结**：${cluster.summary}`,
    ``,
    `## 三、评分解释（总分 ${cluster.totalScore}/100）`,
    ``,
    ...explanation.map((e) => `- **${e.dimension}：${e.score} / ${e.max}** —— ${e.reason}`),
    ``,
    `## 四、付费信号`,
    ``,
    payComments.length > 0
      ? `共 ${payComments.length} 条评论出现明确付费信号：\n\n${payComments.map((c) => `- “${c.rawText}”（${c.sourcePlatform}）`).join("\n")}`
      : `暂无明确的付费表达，建议先用落地页或访谈进一步验证付费意愿。`,
    ``,
    `## 五、产品建议`,
    ``,
    `- **建议 MVP**：${cluster.suggestedMvp}`,
    `- **商业模式**：${cluster.suggestedBusinessModel}`,
    `- **风险提示**：${cluster.riskNotes}`,
    ``,
    `## 六、原始证据（${comments.length} 条）`,
    ``,
    ...comments.map(
      (c, i) =>
        `${i + 1}. “${c.rawText}”\n   - 来源：${c.sourcePlatform}${c.authorName ? ` · ${c.authorName}` : ""} · ${(c.publishedAt ?? c.importedAt).toLocaleDateString("zh-CN")}\n   - 分析：严重度 ${c.painSeverityScore}/10，付费信号 ${c.paymentSignalScore}/10，软件适配 ${c.softwareFitScore}/10，AI 适配 ${c.aiAutomationFitScore}/10`
    ),
    ``,
    `## 七、下一步验证建议`,
    ``,
    `1. 用 5-8 个目标用户访谈验证「${cluster.painDescription}」出现的频率与严重程度。`,
    `2. 做一个描述「${cluster.suggestedMvp}」的落地页，投放到 ${platforms.slice(0, 3).join("、")} 等渠道测试转化。`,
    `3. 若注册转化率 > 5% 或有用户主动询价，再进入 MVP 开发。`,
    ``,
    `---`,
    `本报告由 痛点搜集器 Pain Radar 基于已收集的用户原声自动生成。`,
  ];
  return lines.join("\n");
}
