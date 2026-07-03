import { prisma } from "../src/lib/db";

async function main() {
  const clusters = await prisma.cluster.findMany({ orderBy: { totalScore: "desc" } });
  for (const c of clusters) {
    console.log(`${String(c.totalScore).padStart(3)}分 [${c.trendStatus}] ${c.key.padEnd(30)} ${c.commentCount}条/${c.sourceCount}平台  ${c.title}`);
  }
  const pain = await prisma.comment.count({ where: { isPainPoint: true } });
  console.log("痛点评论:", pain, "/", await prisma.comment.count());
  const orphans = await prisma.comment.findMany({ where: { isPainPoint: true, topicKey: null }, select: { rawText: true } });
  console.log("未命中主题的痛点评论:", orphans.length);
  orphans.forEach((o) => console.log(" -", o.rawText.slice(0, 60)));
  await prisma.$disconnect();
}
main();
