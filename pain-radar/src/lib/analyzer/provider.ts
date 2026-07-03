import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult } from "@/lib/types";
import { analyzeWithRules, matchTopic } from "./rules";

// 统一 Provider 层：
//   1. 有 ANTHROPIC_API_KEY → 用 Claude 分析
//   2. 否则有 OPENAI_API_KEY → 用 OpenAI 分析
//   3. 都没有（或调用失败）→ 本地规则分析器，保证永远能出结果

export type ProviderName = "anthropic" | "openai" | "rules";

export function activeProvider(): ProviderName {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "rules";
}

const SYSTEM_PROMPT = `你是一个市场痛点分析引擎。用户会给你一组来自评论区/论坛/聊天记录的原始文本。
对每一条文本，判断它是否表达了真实的痛点，并抽取结构化信息。
painType 从这些值中选择：重复劳动、信息分散、信息过载、管理混乱、工具体验差、流程复杂、非痛点。
所有 *Score 字段为 0-10 的整数。summary 用一句中文概括。保持输出数组与输入条数、顺序一致。`;

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "isPainPoint", "painType", "targetUser", "userScenario", "jobToBeDone",
          "currentWorkaround", "painDescription", "painSeverityScore",
          "paymentSignalScore", "softwareFitScore", "aiAutomationFitScore",
          "summary", "recommendedSolutionDirection",
        ],
        properties: {
          isPainPoint: { type: "boolean" },
          painType: { type: "string" },
          targetUser: { type: "string" },
          userScenario: { type: "string" },
          jobToBeDone: { type: "string" },
          currentWorkaround: { type: "string" },
          painDescription: { type: "string" },
          painSeverityScore: { type: "integer" },
          paymentSignalScore: { type: "integer" },
          softwareFitScore: { type: "integer" },
          aiAutomationFitScore: { type: "integer" },
          summary: { type: "string" },
          recommendedSolutionDirection: { type: "string" },
        },
      },
    },
  },
} as const;

function buildUserPrompt(texts: string[]): string {
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
  return `请分析以下 ${texts.length} 条评论：\n\n${numbered}`;
}

type RawResult = Omit<AnalysisResult, "topicKey">;

function normalize(raw: Partial<RawResult>, text: string): AnalysisResult {
  // AI 输出兜底：缺字段时用规则结果补齐，并回填聚类用的 topicKey
  const fallback = analyzeWithRules(text);
  const clampScore = (v: unknown, fb: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(10, Math.round(v))) : fb;
  return {
    isPainPoint: typeof raw.isPainPoint === "boolean" ? raw.isPainPoint : fallback.isPainPoint,
    painType: raw.painType || fallback.painType,
    targetUser: raw.targetUser || fallback.targetUser,
    userScenario: raw.userScenario || fallback.userScenario,
    jobToBeDone: raw.jobToBeDone || fallback.jobToBeDone,
    currentWorkaround: raw.currentWorkaround || fallback.currentWorkaround,
    painDescription: raw.painDescription || fallback.painDescription,
    painSeverityScore: clampScore(raw.painSeverityScore, fallback.painSeverityScore),
    paymentSignalScore: clampScore(raw.paymentSignalScore, fallback.paymentSignalScore),
    softwareFitScore: clampScore(raw.softwareFitScore, fallback.softwareFitScore),
    aiAutomationFitScore: clampScore(raw.aiAutomationFitScore, fallback.aiAutomationFitScore),
    summary: raw.summary || fallback.summary,
    recommendedSolutionDirection: raw.recommendedSolutionDirection || fallback.recommendedSolutionDirection,
    topicKey: matchTopic(text)?.key ?? null,
  };
}

async function analyzeWithAnthropic(texts: string[]): Promise<AnalysisResult[]> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: RESULT_SCHEMA } },
    messages: [{ role: "user", content: buildUserPrompt(texts) }],
  });
  if (response.stop_reason === "refusal") throw new Error("model refused");
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("no text block");
  const parsed = JSON.parse(textBlock.text) as { results: Partial<RawResult>[] };
  return texts.map((t, i) => normalize(parsed.results[i] ?? {}, t));
}

async function analyzeWithOpenAI(texts: string[]): Promise<AnalysisResult[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT + '\n输出 JSON：{"results": [...]}' },
        { role: "user", content: buildUserPrompt(texts) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content) as { results: Partial<RawResult>[] };
  return texts.map((t, i) => normalize(parsed.results[i] ?? {}, t));
}

/** 批量分析。永不抛错：AI 失败时自动回退到规则分析器 */
export async function analyzeComments(texts: string[]): Promise<{ results: AnalysisResult[]; provider: ProviderName }> {
  const provider = activeProvider();
  if (provider !== "rules") {
    try {
      const results =
        provider === "anthropic" ? await analyzeWithAnthropic(texts) : await analyzeWithOpenAI(texts);
      return { results, provider };
    } catch (err) {
      console.warn(`[pain-radar] ${provider} 分析失败，回退到规则分析器:`, err);
    }
  }
  return { results: texts.map((t) => analyzeWithRules(t)), provider: "rules" };
}
