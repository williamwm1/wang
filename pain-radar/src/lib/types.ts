// 单条评论的结构化分析结果（AI 或规则分析器统一输出这个形状）
export interface AnalysisResult {
  isPainPoint: boolean;
  painType: string;
  targetUser: string;
  userScenario: string;
  jobToBeDone: string;
  currentWorkaround: string;
  painDescription: string;
  painSeverityScore: number; // 0-10
  paymentSignalScore: number; // 0-10
  softwareFitScore: number; // 0-10
  aiAutomationFitScore: number; // 0-10
  summary: string;
  recommendedSolutionDirection: string;
  /** 内部聚类键；AI 分析时可为空，落库前会回填 */
  topicKey: string | null;
}

export interface ScoreExplanationItem {
  dimension: string;
  score: number;
  max: number;
  reason: string;
}

export const PLATFORMS = [
  "小红书",
  "抖音",
  "B站",
  "知乎",
  "YouTube",
  "Reddit",
  "X",
  "GitHub",
  "微信聊天记录",
  "客服聊天记录",
  "产品评论",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export function opportunityLevel(totalScore: number): "高价值" | "值得观察" | "低优先级" {
  if (totalScore >= 70) return "高价值";
  if (totalScore >= 50) return "值得观察";
  return "低优先级";
}
