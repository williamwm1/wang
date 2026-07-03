import type { AnalysisResult } from "@/lib/types";
import { GENERIC_TOPIC, TOPICS, type TopicDef } from "./topics";

// ---- 关键词表 ----------------------------------------------------------

const STRONG_PAIN_WORDS = [
  "太麻烦", "麻烦死", "太难用", "难用", "浪费时间", "手动", "人工", "一直出错",
  "容易漏", "漏掉", "漏了", "漏过", "漏发", "漏单", "很混乱", "太混乱", "混乱",
  "找不到", "太贵", "太复杂", "不方便", "重复", "每天都要", "烦死", "崩溃",
  "累死", "头疼", "折磨", "出错", "错过", "忘了", "忘记", "来不及", "熬夜",
  "要命", "很烦", "太烦", "好烦", "烦人", "识别不对", "识别错", "识别成",
  "看不过来", "凭感觉", "眼瞎", "灾难", "太难", "痛苦", "全乱", "割裂",
  "frustrating", "manually", "waste of time", "hard to manage", "too many tools",
  "annoying", "tedious", "nightmare", "butchering", "no time to",
];

const FREQUENCY_WORDS = ["每天", "天天", "每次", "一直", "总是", "经常", "反复", "每周", "every day", "every time", "always"];

const MANUAL_WORDS = ["手动", "人工", "手工", "自己整理", "一条条", "挨个", "逐个", "复制粘贴", "manually", "copy paste", "登记本", "纸质", "纸上"];

const ERROR_WORDS = ["漏", "错", "忘", "丢", "延误", "超卖", "miss", "wrong", "forgot"];

const PAYMENT_STRONG = ["愿意付费", "愿意花钱", "花钱也想解决", "付费工具也行", "付费也行", "我愿意买", "愿意买", "花钱买", "付钱", "充钱", "I would pay", "would pay", "shut up and take my money", "多少钱都", "订阅也行"];

const PAYMENT_WEAK = ["有没有付费", "收费的也可以", "买过好几个", "试过付费", "开会员"];

const TOOL_SEEKING = [
  "有没有工具", "有没有软件", "有没有 AI", "有没有ai", "有没有app", "有没有 App",
  "有没有小程序", "求推荐", "求个工具", "谁知道有什么工具", "什么工具可以",
  "looking for a tool", "there should be an app", "need an alternative",
  "is there a tool", "any tool", "recommend a tool", "有推荐的",
  "求一个", "求个", "求推荐", "求总结", "有没有一个",
];

const SCATTER_WORDS = ["Excel", "excel", "表格", "微信群", "多个平台", "多个后台", "好几个群", "好几个平台", "各个平台", "不同软件", "不同平台", "散落", "分散", "Notion", "飞书", "钉钉", "备忘录"];

const AUTOMATION_WORDS = ["自动", "汇总", "整理", "分类", "提醒", "同步", "总结", "生成", "identify", "summarize", "automate", "automatically"];

// ---- 工具函数 ----------------------------------------------------------

function countHits(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  let n = 0;
  for (const w of words) if (lower.includes(w.toLowerCase())) n++;
  return n;
}

function clamp(n: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** 关键词加权匹配，返回得分最高的主题（低于阈值返回 null） */
export function matchTopic(text: string): TopicDef | null {
  let best: TopicDef | null = null;
  let bestScore = 0;
  for (const topic of TOPICS) {
    let score = 0;
    for (const [kw, weight] of Object.entries(topic.keywords)) {
      if (text.toLowerCase().includes(kw.toLowerCase())) score += weight;
    }
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  return bestScore >= 4 ? best : null;
}

// ---- 主分析函数 --------------------------------------------------------

export function analyzeWithRules(rawText: string): AnalysisResult {
  const text = rawText.trim();

  const strongPain = countHits(text, STRONG_PAIN_WORDS);
  const freq = countHits(text, FREQUENCY_WORDS);
  const manual = countHits(text, MANUAL_WORDS);
  const errors = countHits(text, ERROR_WORDS);
  const payStrong = countHits(text, PAYMENT_STRONG);
  const payWeak = countHits(text, PAYMENT_WEAK);
  const toolSeek = countHits(text, TOOL_SEEKING);
  const scatter = countHits(text, SCATTER_WORDS);
  const automation = countHits(text, AUTOMATION_WORDS);

  const topic = matchTopic(text);

  // 是否为真实痛点：出现强痛点词 / 找工具 / 付费信号 / 明确的手动+高频组合
  const painSignal = strongPain + errors + (manual > 0 && freq > 0 ? 1 : 0);
  const isPainPoint =
    painSignal > 0 ||
    toolSeek > 0 ||
    payStrong > 0 ||
    (topic !== null && manual + scatter + freq + strongPain > 0);

  // 痛点严重度：基础 4 分，按信号叠加
  let severity = topic ? topic.base.severity - 2 : 3;
  severity += Math.min(3, strongPain);
  if (freq > 0) severity += 1.5;
  if (manual > 0) severity += 1;
  if (errors > 0) severity += 1;
  if (payStrong > 0) severity += 0.5;
  const painSeverityScore = isPainPoint ? clamp(severity, 1, 10) : clamp(severity, 0, 3);

  // 付费信号
  let payment = 0;
  if (payStrong > 0) payment = 7 + Math.min(2, payStrong - 1);
  else if (payWeak > 0) payment = 5;
  else if (toolSeek > 0) payment = 4;
  else if (isPainPoint && severity >= 7) payment = 2;
  const paymentSignalScore = clamp(payment);

  // 软件可解决性
  let software = topic ? topic.base.softwareFit : isPainPoint ? 6 : 2;
  if (toolSeek > 0) software += 1;
  if (scatter > 0) software += 0.5;
  const softwareFitScore = isPainPoint ? clamp(software, 1, 10) : clamp(software, 0, 4);

  // AI 自动化适配度
  let ai = topic ? topic.base.aiFit : isPainPoint ? 5 : 2;
  if (automation > 0) ai += 0.5;
  if (manual > 0 && freq > 0) ai += 1;
  const aiAutomationFitScore = isPainPoint ? clamp(ai, 1, 10) : clamp(ai, 0, 4);

  // 痛点类型：主题优先，其次按信号推断
  let painType: string;
  if (topic) painType = topic.painType;
  else if (scatter > 1) painType = "信息分散";
  else if (manual > 0 && freq > 0) painType = "重复劳动";
  else if (errors > 0) painType = "管理混乱";
  else if (strongPain > 0) painType = "流程复杂";
  else painType = "非痛点";

  const meta = topic ?? GENERIC_TOPIC;

  const snippet = text.length > 40 ? text.slice(0, 40) + "…" : text;
  const summary = isPainPoint
    ? topic
      ? topic.summary
      : `用户抱怨「${snippet}」，表现出对现有${painType === "非痛点" ? "流程" : painType}问题的不满。`
    : `未检测到明确痛点信号，可能是一般性讨论或正面反馈：「${snippet}」`;

  return {
    isPainPoint,
    painType: isPainPoint ? painType : "非痛点",
    targetUser: meta.targetUser,
    userScenario: meta.userScenario,
    jobToBeDone: meta.jobToBeDone,
    currentWorkaround: manual > 0 || scatter > 0
      ? meta.currentWorkaround
      : isPainPoint ? meta.currentWorkaround : "无",
    painDescription: isPainPoint ? meta.painDescription : "未识别到明确痛点",
    painSeverityScore,
    paymentSignalScore,
    softwareFitScore,
    aiAutomationFitScore,
    summary,
    recommendedSolutionDirection: isPainPoint ? meta.recommendedSolutionDirection : "暂不需要",
    topicKey: topic ? topic.key : null,
  };
}
