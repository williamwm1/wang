// 内置 Demo 评论数据：覆盖 8 个机会方向、11 个来源平台、中英双语。
// daysAgo 用于生成有层次的时间分布，让趋势图和"上升/平稳/新出现"标签自然形成。

export interface DemoComment {
  text: string;
  platform: string;
  author: string;
  daysAgo: number;
  language: "zh" | "en";
}

export const DEMO_COMMENTS: DemoComment[] = [
  // ── A. 多平台内容创作者：重复分发 ─────────────────────────────
  { text: "每天要在小红书、抖音、B站、视频号各发一遍，标题和封面还得分别改，真的烦死了。", platform: "小红书", author: "阿柚爱拍照", daysAgo: 1, language: "zh" },
  { text: "做自媒体最痛苦的就是跨平台分发，一条视频要传四五个平台，每个平台的封面尺寸还不一样，全靠手动。", platform: "知乎", author: "野生运营喵", daysAgo: 2, language: "zh" },
  { text: "有没有工具可以把视频一键发到所有平台？每天重复上传浪费时间，标题还要一个个想。", platform: "B站", author: "剪辑到天亮", daysAgo: 3, language: "zh" },
  { text: "运营账号三年了，最烦的就是发布环节，小红书和抖音的标题风格完全不同，每天都要手动改两版。", platform: "抖音", author: "本地生活小王", daysAgo: 10, language: "zh" },
  { text: "I post the same video to YouTube, TikTok and Instagram every day. Rewriting titles and resizing thumbnails manually is such a waste of time.", platform: "YouTube", author: "DailyVlogDan", daysAgo: 12, language: "en" },
  { text: "求推荐多平台分发工具，付费也行，实在不想每天手动发五个平台了。", platform: "小红书", author: "锅盖头阿姨", daysAgo: 0, language: "zh" },

  // ── B. 小型电商卖家：订单/库存/售后分散 ──────────────────────
  { text: "三个店铺的订单要挨个后台看，库存全记在Excel里，天天人工核对，已经超卖两次了。", platform: "知乎", author: "卖袜子的老周", daysAgo: 9, language: "zh" },
  { text: "小卖家太难了，订单、库存、售后分散在不同平台，每天手动整理表格到半夜。", platform: "小红书", author: "汉服店掌柜", daysAgo: 11, language: "zh" },
  { text: "有没有软件能把拼多多、淘宝、抖店的订单汇总到一起？手动对账真的会出错。", platform: "产品评论", author: "匿名用户", daysAgo: 8, language: "zh" },
  { text: "客服消息、退货、补货全靠微信群里吼，忙起来必然漏单，愿意付费解决这个问题。", platform: "微信聊天记录", author: "群友-明轩百货", daysAgo: 3, language: "zh" },
  { text: "双十一的时候库存表格和实际对不上，超卖了几十单，赔到肉疼，求一个自动同步库存的工具。", platform: "抖音", author: "零食铺不打烊", daysAgo: 15, language: "zh" },
  { text: "As a small Etsy and Shopify seller I track inventory and orders in a spreadsheet, it's a nightmare and orders get missed every week.", platform: "Reddit", author: "u/craftygoods", daysAgo: 5, language: "en" },

  // ── C. 自由职业者：客户沟通与项目管理 ────────────────────────
  { text: "客户在微信问我，另一个客户在邮箱发修改意见，还有人 WhatsApp 催进度，我已经漏过两次交付了。", platform: "微信聊天记录", author: "设计师大C", daysAgo: 1, language: "zh" },
  { text: "自由职业三年，最大的痛就是客户消息散在微信、邮件、飞书里，每天手动整理待办，总是漏回复。", platform: "知乎", author: "独立翻译Momo", daysAgo: 2, language: "zh" },
  { text: "有没有工具能自动汇总所有客户的聊天记录并提醒截止日期？我愿意付费。", platform: "X", author: "@freelance_ke", daysAgo: 0, language: "zh" },
  { text: "接了五个项目之后彻底乱了，截止日期全记在备忘录里，上周忘了一个交付，客户直接跑了。", platform: "小红书", author: "插画师栗子", daysAgo: 4, language: "zh" },
  { text: "Managing clients across email, WhatsApp and Slack is hard to manage, I keep missing deadlines. I would pay for a tool that pulls everything together.", platform: "Reddit", author: "u/solo_dev_life", daysAgo: 3, language: "en" },
  { text: "现在只能用 Excel 管理客户和项目，太混乱了，客户的修改意见找不到，报价单也找不到。", platform: "客服聊天记录", author: "咨询顾客-Lily", daysAgo: 13, language: "zh" },

  // ── D. 家长：家长群与学校通知信息过载 ────────────────────────
  { text: "三个家长群、两个兴趣班群、一个班级群，每天爬楼找通知，昨天差点错过交费截止时间。", platform: "微信聊天记录", author: "糖糖妈妈", daysAgo: 2, language: "zh" },
  { text: "学校通知全发在群里，夹在几百条闲聊中间，老师还喜欢用图片发通知，找起来要命。", platform: "小红书", author: "二宝妈的日常", daysAgo: 9, language: "zh" },
  { text: "有没有 AI 能自动帮我从家长群里提取重要通知？孩子两个兴趣班加学校，信息多到崩溃。", platform: "知乎", author: "程序员奶爸", daysAgo: 12, language: "zh" },
  { text: "每天都要翻班级群记作业和打卡要求，漏一条老师就点名，真的很混乱。", platform: "小红书", author: "一年级新生家长", daysAgo: 10, language: "zh" },
  { text: "二胎家长表示日程表完全靠脑子记，接送、兴趣班、家长会经常冲突，求一个自动整理的工具。", platform: "抖音", author: "俩娃他爹", daysAgo: 4, language: "zh" },

  // ── E. AI 工具重度用户：识别错误/提示词分散/工作流割裂 ───────
  { text: "语音输入说 Claude，经常给我识别成 cloud，AI 工具相关词基本都识别不对，改字改得很烦。", platform: "X", author: "@prompt_daily", daysAgo: 1, language: "zh" },
  { text: "提示词存在备忘录、飞书文档、微信收藏里，用的时候永远找不到，每天都要重复找一遍。", platform: "知乎", author: "AI打工人小灰", daysAgo: 2, language: "zh" },
  { text: "在 ChatGPT、Claude、Gemini 之间来回切换，上下文全靠复制粘贴，工作流太割裂了。", platform: "X", author: "@ml_builder", daysAgo: 3, language: "zh" },
  { text: "My voice transcription keeps butchering AI terms like Claude and prompt engineering. Fixing them manually every single time is frustrating.", platform: "Reddit", author: "u/whisper_user42", daysAgo: 5, language: "en" },
  { text: "求一个能管理提示词的工具，团队里每个人都在重复写差不多的 prompt，太浪费时间了。", platform: "GitHub", author: "dev-anna", daysAgo: 0, language: "zh" },

  // ── F. 小企业老板：多后台经营数据 ────────────────────────────
  { text: "开了两家店，每天早上要看销售后台、库存后台、客服后台、投放后台，一小时没了，还是不知道哪里出了问题。", platform: "知乎", author: "餐饮老兵老谢", daysAgo: 8, language: "zh" },
  { text: "老板让我每天手动把五个后台的数据汇总成日报，Excel 做到眼瞎，这种事不应该自动化吗？", platform: "微信聊天记录", author: "运营部小鹿", daysAgo: 9, language: "zh" },
  { text: "小公司没有数据团队，财务、销售、投放数据全分散，月底对不上账，愿意花钱买个自动汇总的看板。", platform: "知乎", author: "跨境小老板Ken", daysAgo: 2, language: "zh" },
  { text: "经营数据分散在各个系统里，我最需要的是每天告诉我三件最重要的事，而不是十个报表。", platform: "X", author: "@saas_owner_cn", daysAgo: 11, language: "zh" },
  { text: "每天在多个后台之间来回切换，数据导出再手动合并表格，重复劳动，效率极低。", platform: "产品评论", author: "匿名企业用户", daysAgo: 5, language: "zh" },

  // ── G. 内容创作者：评论区洞察 ────────────────────────────────
  { text: "每次刷评论都能看到大家问同一个问题，但我根本没时间一条条整理，有没有工具能自动帮我分类？", platform: "B站", author: "科普区UP阿磊", daysAgo: 1, language: "zh" },
  { text: "视频火了之后评论几千条，选题灵感全在里面，但人肉翻评论太浪费时间了。", platform: "抖音", author: "厨房里的老白", daysAgo: 2, language: "zh" },
  { text: "粉丝问的问题重复率超高，每天手动回复到手软，求一个能自动总结高频问题的工具。", platform: "小红书", author: "健身教练Vivi", daysAgo: 8, language: "zh" },
  { text: "I have thousands of comments on my videos and no time to read them. There should be an app that summarizes what my audience is asking for.", platform: "YouTube", author: "TechReviewMia", daysAgo: 4, language: "en" },
  { text: "弹幕和评论里全是用户需求，可惜没法自动整理，每次做选题只能凭感觉。", platform: "B站", author: "游戏考古君", daysAgo: 9, language: "zh" },

  // ── H. 线下门店：预约/套餐/客户跟进 ──────────────────────────
  { text: "套餐还有几次、客户有没有选片、有没有退款，全靠前台记表格，忙的时候肯定会出错。", platform: "客服聊天记录", author: "橙子摄影-店长", daysAgo: 1, language: "zh" },
  { text: "开摄影工作室的，预约排期全在纸质登记本上，客户改期一次全乱，体验很差。", platform: "小红书", author: "胶片与猫工作室", daysAgo: 3, language: "zh" },
  { text: "教培机构课时核销靠 Excel，家长问剩余课时要查半天，经常对不上，很混乱。", platform: "知乎", author: "少儿美术张老师", daysAgo: 10, language: "zh" },
  { text: "美业门店的会员卡余次和复购提醒全靠店员脑子记，流失了好多老客，愿意付费上系统。", platform: "抖音", author: "皮肤管理Luna", daysAgo: 2, language: "zh" },
  { text: "约课、改期、请假全在微信里聊，排期表手动改，每天都要出错，求一个轻量的预约工具。", platform: "微信聊天记录", author: "瑜伽馆-静姐", daysAgo: 5, language: "zh" },
  { text: "客户套餐到期没人提醒，复购全看缘分，前台登记本丢了一页直接灾难。", platform: "产品评论", author: "匿名门店经营者", daysAgo: 12, language: "zh" },

  // ── 非痛点样本（让"是否为真实痛点"的判断可演示） ─────────────
  { text: "这个视频拍得真好，学到了很多，谢谢博主分享！", platform: "B站", author: "路人甲小明", daysAgo: 1, language: "zh" },
  { text: "Great product, works exactly as advertised. Five stars from me.", platform: "产品评论", author: "verified_buyer", daysAgo: 6, language: "en" },
];

// 导入页"一键导入示例"按钮用的 8 条示例
export const SAMPLE_IMPORT_TEXTS = [
  "每天都要手动把客户聊天记录整理到表格里，真的太浪费时间了。",
  "有没有一个工具可以自动把微信、邮箱和 WhatsApp 的客户消息汇总起来？",
  "我愿意花钱买一个能自动提醒客户跟进和项目截止日期的工具。",
  "客户在不同软件里发消息，我已经漏了两次重要回复。",
  "现在只能用 Excel 管理客户和项目，太混乱了。",
  "每天要把同一条视频发到小红书、抖音、B站，标题封面挨个改，重复劳动烦死了。",
  "门店套餐剩余次数全靠前台登记本记录，忙的时候经常出错，求一个预约管理工具。",
  "语音输入 AI 工具的专业词总是识别错，提示词也散落在各个笔记里，找不到。",
].join("\n");
