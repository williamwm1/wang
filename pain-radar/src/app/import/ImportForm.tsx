"use client";

import { useState } from "react";
import Link from "next/link";
import { PLATFORMS } from "@/lib/types";
import { MiniScore, PainBadge } from "@/components/badges";

const SAMPLE_TEXTS = [
  "每天都要手动把客户聊天记录整理到表格里，真的太浪费时间了。",
  "有没有一个工具可以自动把微信、邮箱和 WhatsApp 的客户消息汇总起来？",
  "我愿意花钱买一个能自动提醒客户跟进和项目截止日期的工具。",
  "客户在不同软件里发消息，我已经漏了两次重要回复。",
  "现在只能用 Excel 管理客户和项目，太混乱了。",
  "每天要把同一条视频发到小红书、抖音、B站，标题封面挨个改，重复劳动烦死了。",
  "门店套餐剩余次数全靠前台登记本记录，忙的时候经常出错，求一个预约管理工具。",
  "语音输入 AI 工具的专业词总是识别错，提示词也散落在各个笔记里，找不到。",
].join("\n");

interface ResultItem {
  id: string;
  text: string;
  isPainPoint: boolean;
  painType: string;
  targetUser: string;
  userScenario: string;
  jobToBeDone: string;
  currentWorkaround: string;
  painDescription: string;
  painSeverityScore: number;
  paymentSignalScore: number;
  softwareFitScore: number;
  aiAutomationFitScore: number;
  summary: string;
  recommendedSolutionDirection: string;
  cluster: { id: string; title: string; totalScore: number } | null;
}

type Phase = "idle" | "running" | "done" | "error";

export function ImportForm() {
  const [platform, setPlatform] = useState<string>("小红书");
  const [language, setLanguage] = useState("auto");
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [provider, setProvider] = useState("");
  const [error, setError] = useState("");

  const lineCount = text.split("\n").filter((l) => l.trim()).length;

  async function analyze() {
    const texts = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (texts.length === 0) return;
    setPhase("running");
    setResults([]);
    setError("");
    setProgress(8);
    // 模拟进度（真实请求为一次批量调用）
    const timer = setInterval(() => setProgress((p) => Math.min(90, p + Math.random() * 14)), 350);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platform, language, texts }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `分析失败（HTTP ${res.status}）`);
      }
      const data = await res.json();
      setResults(data.results);
      setProvider(data.provider);
      setProgress(100);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    } finally {
      clearInterval(timer);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="block text-xs text-muted mb-1">来源平台</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-xs text-muted mb-1">文本语言</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm"
            >
              <option value="auto">自动识别</option>
              <option value="zh">中文</option>
              <option value="en">英文</option>
            </select>
          </label>
          <button
            onClick={() => setText(SAMPLE_TEXTS)}
            className="ml-auto self-end rounded-lg border border-line px-3 py-1.5 text-sm text-secondary hover:bg-surface-2 transition-colors"
          >
            ⚡ 一键导入示例
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          placeholder={"粘贴评论，每行一条，例如：\n每天要在小红书、抖音、B站各发一遍，标题和封面还得分别改，真的烦死了。\n有没有工具可以自动汇总客户消息？我愿意付费。"}
          className="w-full rounded-lg border border-line bg-surface-2 p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={analyze}
            disabled={phase === "running" || lineCount === 0}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {phase === "running" ? "分析中…" : "开始分析"}
          </button>
          <span className="text-xs text-muted">{lineCount} 条待分析</span>
          {phase === "done" && (
            <span className="text-xs text-muted ml-auto">
              分析引擎：{provider === "rules" ? "本地规则分析器（未配置 API Key）" : provider === "anthropic" ? "Claude API" : "OpenAI API"}
            </span>
          )}
        </div>

        {phase === "running" && (
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {phase === "error" && (
          <p className="text-sm text-[var(--status-critical)]">{error}</p>
        )}
      </div>

      {phase === "done" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="font-medium">
              分析结果
              <span className="ml-2 text-sm text-muted font-normal">
                {results.filter((r) => r.isPainPoint).length}/{results.length} 条为真实痛点，已保存并重新聚类
              </span>
            </h2>
            <Link href="/radar" className="ml-auto text-sm text-accent hover:underline">
              查看机会雷达 →
            </Link>
          </div>

          {results.map((r) => (
            <div key={r.id} className="rounded-xl border border-line bg-surface p-4 space-y-3">
              <div className="flex items-start gap-3">
                <p className="flex-1 text-sm">{r.text}</p>
                <PainBadge isPain={r.isPainPoint} />
              </div>

              {r.isPainPoint && (
                <>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    <Field label="痛点类型" value={r.painType} />
                    <Field label="用户是谁" value={r.targetUser} />
                    <Field label="使用场景" value={r.userScenario} />
                    <Field label="想完成什么" value={r.jobToBeDone} />
                    <Field label="当前怎么处理" value={r.currentWorkaround} />
                    <Field label="核心问题" value={r.painDescription} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                    <MiniScore label="痛点严重程度" value={r.painSeverityScore} />
                    <MiniScore label="付费信号" value={r.paymentSignalScore} />
                    <MiniScore label="软件适配度" value={r.softwareFitScore} />
                    <MiniScore label="AI 自动化适配" value={r.aiAutomationFitScore} />
                  </div>
                  <div className="rounded-lg bg-surface-2 p-3 text-sm space-y-1">
                    <p><span className="text-muted">AI 总结：</span>{r.summary}</p>
                    <p><span className="text-muted">推荐方向：</span>{r.recommendedSolutionDirection}</p>
                  </div>
                  {r.cluster && (
                    <Link
                      href={`/opportunity/${r.cluster.id}`}
                      className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                    >
                      已归入机会：{r.cluster.title}（{r.cluster.totalScore} 分）→
                    </Link>
                  )}
                </>
              )}
              {!r.isPainPoint && (
                <p className="text-sm text-muted">{r.summary}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="text-muted">{label}：</span>
      <span className="text-secondary">{value}</span>
    </p>
  );
}
