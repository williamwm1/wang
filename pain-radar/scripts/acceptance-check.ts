import { analyzeWithRules } from "../src/lib/analyzer/rules";
const tests = [
  "每天都要手动把客户聊天记录整理到表格里，真的太浪费时间了。",
  "有没有一个工具可以自动把微信、邮箱和 WhatsApp 的客户消息汇总起来？",
  "我愿意花钱买一个能自动提醒客户跟进和项目截止日期的工具。",
  "客户在不同软件里发消息，我已经漏了两次重要回复。",
  "现在只能用 Excel 管理客户和项目，太混乱了。",
];
for (const t of tests) {
  const r = analyzeWithRules(t);
  console.log(`pain=${r.isPainPoint} topic=${r.topicKey} sev=${r.painSeverityScore} pay=${r.paymentSignalScore} sw=${r.softwareFitScore} ai=${r.aiAutomationFitScore}  ${t.slice(0, 30)}`);
}
