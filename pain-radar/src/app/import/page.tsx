import { ImportForm } from "./ImportForm";

export const metadata = { title: "导入评论并分析 · Pain Radar" };

export default function ImportPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">导入评论并分析</h1>
        <p className="text-sm text-muted mt-0.5">
          粘贴来自评论区、论坛、聊天记录的原始文本，每行一条。系统会识别真实痛点，
          自动提取用户、场景、付费信号，并归入市场机会。
        </p>
      </div>
      <ImportForm />
    </div>
  );
}
