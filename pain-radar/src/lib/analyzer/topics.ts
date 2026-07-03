// 预置的机会方向（主题）定义。
// 规则分析器用关键词把评论归入这些主题；聚类与机会卡片的元信息也来自这里。

export interface TopicDef {
  key: string;
  title: string;
  industry: string;
  painType: string;
  targetUser: string;
  userScenario: string;
  jobToBeDone: string;
  currentWorkaround: string;
  painDescription: string;
  summary: string;
  recommendedSolutionDirection: string;
  recommendedProductDirection: string;
  suggestedMvp: string;
  suggestedBusinessModel: string;
  riskNotes: string;
  /** 关键词 → 权重。命中权重和最高的主题获胜 */
  keywords: Record<string, number>;
  /** 主题基础分（0-10），会再按评论文本微调 */
  base: { severity: number; softwareFit: number; aiFit: number };
}

export const TOPICS: TopicDef[] = [
  {
    key: "creator-multiplatform",
    title: "多平台内容创作者的一键分发与适配工具",
    industry: "内容创作",
    painType: "重复劳动",
    targetUser: "多平台内容创作者",
    userScenario: "每天要把同一条内容分别发布到小红书、抖音、B站、视频号等多个平台",
    jobToBeDone: "一次制作，多平台自动适配标题、封面并发布",
    currentWorkaround: "每个平台手动改标题、换封面、重新上传",
    painDescription: "跨平台发布全靠手动重复操作，标题封面逐个修改，耗时且容易漏发",
    summary: "创作者被多平台重复发布与逐平台适配拖垮，强烈需要自动化分发工具。",
    recommendedSolutionDirection: "多平台一键分发 + AI 自动生成平台化标题与封面",
    recommendedProductDirection:
      "面向中小创作者的多平台内容分发工作台：一次上传，AI 按平台风格生成标题/封面/简介，定时同步发布",
    suggestedMvp: "支持 3 个平台（小红书/抖音/B站）的网页端一键发布 + AI 标题改写",
    suggestedBusinessModel: "按月订阅（按接入平台数分档），高级版提供 AI 封面与数据看板",
    riskNotes: "平台开放接口与内容规则限制是最大风险；需处理各平台风控与授权成本",
    keywords: {
      小红书: 2, 抖音: 2, "B站": 2, 视频号: 2, 各发一遍: 4, 发一遍: 3,
      封面: 3, 标题: 2, 多个平台发: 4, 跨平台: 3, 分发: 3, 选题: 2,
      剪辑: 2, 发布: 1, 运营账号: 2, 同步发: 3, 一键发: 4, 所有平台: 4,
      多平台: 3, 重复上传: 4, tiktok: 3, youtube: 2, instagram: 3,
      thumbnail: 4, "same video": 4, "cross-post": 4,
    },
    base: { severity: 7, softwareFit: 9, aiFit: 9 },
  },
  {
    key: "merchant-ops",
    title: "小商家订单/库存/售后一体化经营工具",
    industry: "电商零售",
    painType: "信息分散",
    targetUser: "小型电商卖家",
    userScenario: "每天在多个店铺后台、表格和聊天工具之间切换处理订单、库存和售后",
    jobToBeDone: "统一管理订单、库存、客户和售后信息，减少人工核对",
    currentWorkaround: "Excel 表格 + 人工核对 + 微信群沟通",
    painDescription: "经营数据分散在不同平台和表格里，人工同步容易漏单、错发、超卖",
    summary: "小商家的订单、库存、售后散落各处，靠表格和人肉同步，出错成本高。",
    recommendedSolutionDirection: "面向小商家的轻量一体化经营看板与自动对账工具",
    recommendedProductDirection:
      "聚合多平台订单/库存/售后的小商家经营中台：自动同步、异常预警、AI 生成每日经营摘要",
    suggestedMvp: "对接 1-2 个主流电商平台的订单聚合看板 + 库存预警 + CSV 导入",
    suggestedBusinessModel: "SaaS 订阅（按店铺数收费），增值服务收取对账与报表费用",
    riskNotes: "电商平台 API 权限与数据合规门槛较高；商家付费意愿依赖明确的省时省钱证明",
    keywords: {
      订单: 4, 库存: 4, 售后: 3, 发货: 3, 超卖: 4, 对账: 3, 买家: 3,
      店铺: 2, 电商: 2, 退货: 2, 补货: 3, 上架: 2, 快递: 2, 客服消息: 2,
      etsy: 4, shopify: 4, inventory: 3, seller: 2, orders: 2,
    },
    base: { severity: 7, softwareFit: 9, aiFit: 8 },
  },
  {
    key: "freelancer-comm",
    title: "自由职业者客户沟通与项目管理",
    industry: "自由职业服务",
    painType: "信息分散",
    targetUser: "自由职业者",
    userScenario: "客户沟通散落在微信、邮件、WhatsApp 等多个渠道，同时并行多个项目",
    jobToBeDone: "把所有客户消息和项目节点汇总到一处，不漏回复、不错过截止日期",
    currentWorkaround: "手动把聊天记录整理到 Excel / Notion，靠记忆跟进",
    painDescription: "多渠道客户消息无法统一跟踪，经常漏回复、忘截止日期、错过交付",
    summary: "自由职业者的客户沟通与项目节点分散在多个工具里，漏回复和延误交付频发。",
    recommendedSolutionDirection: "多渠道客户消息聚合 + 自动跟进提醒的个人 CRM",
    recommendedProductDirection:
      "面向自由职业者的轻量客户管理工具：聚合微信/邮件/WhatsApp 消息，AI 提取待办与截止日期并自动提醒",
    suggestedMvp: "邮件 + 手动粘贴聊天记录的统一收件箱，AI 识别待办事项并生成跟进提醒",
    suggestedBusinessModel: "免费版限 3 个客户，按月订阅解锁不限客户与自动提醒",
    riskNotes: "微信等封闭生态接入受限，可能需要以插件/剪贴板方案绕行；单人付费客单价低",
    keywords: {
      客户: 3, 漏回: 5, 漏了: 3, 漏过: 4, 回复: 2, WhatsApp: 4, whatsapp: 4,
      邮箱: 3, 邮件: 3, 截止日期: 5, 截止: 3, 交付: 3, 项目: 2, 跟进: 3,
      甲方: 4, 报价: 2, 客户消息: 4, 聊天记录: 3, 催进度: 4, freelance: 3,
    },
    base: { severity: 8, softwareFit: 9, aiFit: 9 },
  },
  {
    key: "parent-info",
    title: "家长的学校通知与孩子日程管理助手",
    industry: "家庭教育",
    painType: "信息过载",
    targetUser: "家长",
    userScenario: "同时身处多个家长群、学校群、兴趣班群，每天刷群找通知、记日程",
    jobToBeDone: "自动汇总学校和兴趣班的关键通知，管理孩子的日程安排",
    currentWorkaround: "手动爬楼翻群消息，用备忘录或纸条记录",
    painDescription: "重要通知淹没在大量群消息里，经常错过交费、活动和作业要求",
    summary: "家长在几十个群里人肉筛选学校通知，信息过载导致频繁错过关键事项。",
    recommendedSolutionDirection: "群消息智能摘要 + 家庭日程自动提醒工具",
    recommendedProductDirection:
      "家长信息助手：粘贴/转发群消息后 AI 自动提取通知要点、时间地点与待办，生成家庭日历",
    suggestedMvp: "微信群消息粘贴解析 → 自动生成待办和日历提醒的小程序",
    suggestedBusinessModel: "免费获客 + 家庭版订阅（多孩、多群、共享日历）",
    riskNotes: "群消息获取依赖手动转发，体验有摩擦；家长付费习惯需教育",
    keywords: {
      家长群: 5, 学校: 3, 老师: 2, 兴趣班: 4, 孩子: 3, 作业: 3, 接送: 3,
      通知: 3, 交费: 3, 班级群: 4, 爬楼: 4, 开家长会: 3, 打卡: 2,
    },
    base: { severity: 7, softwareFit: 8, aiFit: 9 },
  },
  {
    key: "ai-workflow",
    title: "AI 重度用户的提示词与多模型工作流管理",
    industry: "AI 工具",
    painType: "工具体验差",
    targetUser: "AI 工具重度使用者",
    userScenario: "在多个 AI 模型和工具之间切换，用语音输入、管理提示词、维护上下文",
    jobToBeDone: "让语音输入准确识别专业词汇，统一管理提示词与多模型工作流",
    currentWorkaround: "手动改错字、在备忘录里存提示词、来回复制粘贴上下文",
    painDescription: "语音识别对 AI 专业词汇错误率高，提示词和资料散落，多工具工作流割裂",
    summary: "AI 重度用户被识别错误、提示词散乱和割裂的多模型工作流反复消耗。",
    recommendedSolutionDirection: "面向 AI 用户的提示词库 + 专业词汇语音输入 + 工作流串联工具",
    recommendedProductDirection:
      "AI 工作台：自定义词典的语音输入、可搜索的提示词库、跨模型上下文同步",
    suggestedMvp: "浏览器插件：提示词库 + 一键在多个模型间携带上下文切换",
    suggestedBusinessModel: "个人订阅制；团队版提供共享提示词库与用量统计",
    riskNotes: "头部 AI 厂商可能原生集成同类能力；用户迁移成本低、竞争激烈",
    keywords: {
      语音输入: 5, 识别成: 4, 识别错: 4, 提示词: 4, prompt: 4, Prompt: 4,
      Claude: 3, ChatGPT: 3, GPT: 2, 模型: 2, "AI 工具": 3, AI工具: 3,
      上下文: 3, 改字: 3, 转写: 3, 幻觉: 2, workflow: 2,
    },
    base: { severity: 6, softwareFit: 9, aiFit: 9 },
  },
  {
    key: "owner-dashboard",
    title: "小企业老板的多后台经营数据聚合看板",
    industry: "企业服务",
    painType: "信息分散",
    targetUser: "小企业老板",
    userScenario: "每天要打开销售、库存、客服、投放、财务等多个后台查看经营状况",
    jobToBeDone: "一眼看清今天生意的关键变化和最需要处理的问题",
    currentWorkaround: "挨个登录各个后台，或让员工手动汇总日报",
    painDescription: "经营数据分散在多个系统，老板无法快速判断当天最重要的问题是什么",
    summary: "小企业老板每天巡视多个后台却仍抓不住重点，需要自动聚合与异常提示。",
    recommendedSolutionDirection: "多系统数据聚合 + AI 每日经营简报与异常预警",
    recommendedProductDirection:
      "老板驾驶舱：自动拉取/导入各后台数据，AI 生成每日三件最重要的事和异常告警",
    suggestedMvp: "支持 CSV/截图导入的经营日报生成器，每天推送一条 AI 摘要到微信",
    suggestedBusinessModel: "按公司订阅，梯度定价；数据接入服务一次性收费",
    riskNotes: "数据源接入碎片化、实施成本高；需要先证明摘要的决策价值",
    keywords: {
      后台: 4, 投放: 3, 财务: 3, 报表: 3, 日报: 3, 看板: 3, 经营: 3,
      销售数据: 4, 老板: 3, 员工: 2, 门店数据: 3, 汇总: 2, 数据分散: 4,
    },
    base: { severity: 7, softwareFit: 8, aiFit: 9 },
  },
  {
    key: "creator-comments",
    title: "创作者评论区洞察与高频需求自动总结",
    industry: "内容创作",
    painType: "信息过载",
    targetUser: "内容创作者",
    userScenario: "每天收到大量评论和私信，需要从中发现选题、答疑和用户需求",
    jobToBeDone: "自动分类总结评论区的高频问题和内容需求",
    currentWorkaround: "有空时人肉翻评论，凭印象记住大家在问什么",
    painDescription: "评论量大到看不过来，高频问题和选题线索被淹没，重复回答消耗精力",
    summary: "创作者没时间逐条看评论，错失高频需求与选题灵感，希望自动聚类总结。",
    recommendedSolutionDirection: "评论批量导入 + AI 聚类总结高频问题与选题建议",
    recommendedProductDirection:
      "评论洞察工具：一键导入各平台评论，AI 输出高频问题榜、情绪分布与下期选题建议",
    suggestedMvp: "粘贴/导出评论 CSV → 自动聚类 + 高频问题 Top10 报告",
    suggestedBusinessModel: "按分析量阶梯订阅；MCN 团队版按账号数收费",
    riskNotes: "各平台评论导出受限；分析结果需足够准确才能建立信任",
    keywords: {
      评论: 4, 翻评论: 5, 刷评论: 5, 私信: 3, 高频: 3, 弹幕: 3,
      粉丝问: 4, 同一个问题: 4, 选题: 3, 整理评论: 5, 用户想看: 4, 求总结: 3,
      comments: 4, audience: 3, "my videos": 3,
    },
    base: { severity: 6, softwareFit: 9, aiFit: 10 },
  },
  {
    key: "local-store",
    title: "线下门店的预约、套餐与客户跟进数字化",
    industry: "本地生活服务",
    painType: "管理混乱",
    targetUser: "线下服务门店经营者",
    userScenario: "摄影店/教培/美业门店要管理预约排期、套餐剩余次数、客户跟进与复购",
    jobToBeDone: "准确记录每个客户的套餐权益和预约安排，自动提醒跟进与复购",
    currentWorkaround: "前台用 Excel 或纸质登记本记录，靠人脑记跟进",
    painDescription: "套餐次数、选片、退款、排期全靠手工台账，忙时必然出错、客诉不断",
    summary: "线下门店的预约与套餐权益管理停留在表格和纸面，出错率高且复购流失。",
    recommendedSolutionDirection: "轻量门店 SaaS：预约排期 + 套餐核销 + 自动复购提醒",
    recommendedProductDirection:
      "门店经营助手：手机端管理预约日历、套餐余次自动核销、客户跟进与复购提醒",
    suggestedMvp: "单店版预约日历 + 套餐次数核销 + 到期/复购自动提醒",
    suggestedBusinessModel: "按门店按月订阅，短信/微信提醒按量计费",
    riskNotes: "线下商家数字化意愿参差；需要极低的上手门槛和迁移成本",
    keywords: {
      预约: 4, 套餐: 4, 剩余次数: 5, 余次: 4, 选片: 5, 排期: 4, 复购: 4,
      门店: 3, 会员卡: 4, 课时: 4, 核销: 4, 前台: 3, 退款: 2, 登记本: 4,
      约课: 4, 到店: 3,
    },
    base: { severity: 8, softwareFit: 9, aiFit: 7 },
  },
];

export const GENERIC_TOPIC: Omit<TopicDef, "keywords" | "base"> = {
  key: "generic",
  title: "其他待归类痛点",
  industry: "通用",
  painType: "流程复杂",
  targetUser: "普通用户",
  userScenario: "日常工作或生活场景",
  jobToBeDone: "更高效地完成当前依赖手工处理的事情",
  currentWorkaround: "手动处理或使用通用工具拼凑",
  painDescription: "现有流程依赖手工操作，效率低且容易出错",
  summary: "用户表达了对现有流程效率的不满，值得进一步收集同类评论验证。",
  recommendedSolutionDirection: "先收集更多同类评论，验证问题频率后再定产品方向",
  recommendedProductDirection: "暂以内容/社区方式聚集同类用户，验证需求真实度",
  suggestedMvp: "落地页 + 等待名单验证需求",
  suggestedBusinessModel: "待验证",
  riskNotes: "样本量不足，痛点真实度与频率有待验证",
};

export function findTopic(key: string | null | undefined): TopicDef | null {
  if (!key) return null;
  return TOPICS.find((t) => t.key === key) ?? null;
}
