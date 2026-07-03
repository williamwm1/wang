import { seedDemoData } from "../src/lib/seed";

seedDemoData()
  .then(({ commentCount, clusterCount }) => {
    console.log(`✅ Demo 数据写入完成：${commentCount} 条评论，${clusterCount} 个机会簇`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 写入 Demo 数据失败:", err);
    process.exit(1);
  });
