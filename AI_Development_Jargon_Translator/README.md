# AI 开发黑话翻译手册
### AI Development Jargon Translator
> 程序员是怎么说的，普通人应该怎么理解。

把 AI、开发、GitHub 里的黑话，翻译成完全不懂技术的人也能听懂的话，
再翻译成 AI 能执行的开发需求。一词一页，可打印，可作为开源学习资料，
也可作为 **AI Product Clarifier Skill** 的知识底座。

翻译逻辑：**程序员语言 → 普通人语言 → AI 能执行的开发需求语言。**

---

## 📚 三册内容

| 册 | 主题 | 术语数 | PDF |
|----|------|--------|-----|
| 第一册 | AI 产品基础 | 89 | `04_Output_PDF/AI开发黑话翻译手册_第一册_AI产品基础.pdf` |
| 第二册 | AI 开发与部署 | 94 | `04_Output_PDF/AI开发黑话翻译手册_第二册_AI开发与部署.pdf` |
| 第三册 | AI 编程与 GitHub | 84 | `04_Output_PDF/AI开发黑话翻译手册_第三册_AI编程与GitHub.pdf` |

合计 **267** 个术语，每个术语都有完整解释，一词独占一页。

## ✍️ 每个术语包含

中文术语 · 英文术语 · 分类 · 一句话理解 · 生活中的例子 ·
程序员真正想表达什么 · AI 会翻译成什么开发需求 · 什么时候需要 ·
什么时候不需要 · 没有它会怎样 · 小白应该怎么告诉 AI · 一句记忆口诀

示例（数据库）：
> **一句话理解**：你希望下次打开时，之前的内容还在。
> **生活中的例子**：微信聊天记录不会因为关掉微信就消失。
> **AI 会翻译成什么**：需要数据持久化，可能用 SQLite、Supabase 或数据库。

## 🗂️ 目录结构

```
AI_Development_Jargon_Translator/
├── 01_Source/            # 术语源文件（Markdown，可直接阅读/复用）
│   ├── volume_01_product_terms.md
│   ├── volume_02_dev_deploy_terms.md
│   └── volume_03_ai_github_terms.md
├── 02_Design/            # 设计系统与版式规范
│   ├── design_system.md
│   └── layout_spec.md
├── 03_Book_Source/       # 书籍源文件（HTML + CSS）
│   ├── volume_01_book.html
│   ├── volume_02_book.html
│   ├── volume_03_book.html
│   └── styles.css
├── 04_Output_PDF/        # 三册成品 PDF（A4，可打印）
├── 05_Index/             # 总索引（三册全部术语）
│   └── all_terms_index.md
├── build/                # 构建脚本与结构化术语数据
│   ├── data_v1.py  data_v2.py  data_v3.py
│   ├── build.py          # 数据 → Markdown + HTML + 索引
│   └── render.py         # HTML → PDF（Playwright/Chromium）
├── README.md
└── CHANGELOG.md
```

## 🔧 如何重新生成

内容的唯一真源是 `build/data_v*.py`。改完数据后：

```bash
# 1. 由数据生成 Markdown 源文件、HTML 书籍、总索引
python3 build/build.py

# 2. 由 HTML 渲染出三册 PDF（需要 Playwright + Chromium）
pip install playwright
python3 build/render.py
```

字体依赖：中文 `Noto Sans CJK SC`、英文 `Inter`、等宽 `DejaVu Sans Mono`
（或等价的 PingFang SC / Helvetica Neue / JetBrains Mono）。

## 🎨 设计

- A4 纵向，适合打印，留白充足，一词一页。
- 米白 / 浅灰 / 黑为主，四套低饱和分类强调色（橙 · 蓝 · 绿 · 紫）。
- 参考气质：Apple 产品手册 · MUJI 说明书 · Notion 知识库 · 高级电子书。
- 详见 `02_Design/design_system.md` 与 `02_Design/layout_spec.md`。

## 🤝 作为 Skill 知识底座

当用户在 AI Product Clarifier Skill 中选择“我不太理解”时，
Skill 可引用本手册对应术语的「一句话理解」「生活中的例子」等字段。
`build/data_v*.py` 是结构化数据，便于程序读取。

## 📄 许可

以 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 开源。
可自由分享、打印、用于学习与教学，注明出处即可。
