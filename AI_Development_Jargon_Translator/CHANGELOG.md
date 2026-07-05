# 更新日志 · Changelog

本项目版本遵循语义化版本（Semantic Versioning）。

## [1.0.0] — 2026-07-05

首个正式版本。三册《AI 开发黑话翻译手册》完整成书。

### 新增
- **第一册 · AI 产品基础**：89 个术语。
- **第二册 · AI 开发与部署**：94 个术语。
- **第三册 · AI 编程与 GitHub**：84 个术语。
- 合计 **267** 个术语，每个术语含 11 个字段的完整解释，一词独占一页。
- 三册成品 PDF（A4 纵向，适合打印）：`04_Output_PDF/`。
- 术语源文件（Markdown）：`01_Source/`。
- 书籍源文件（HTML + CSS）：`03_Book_Source/`。
- 设计系统与版式规范：`02_Design/design_system.md`、`layout_spec.md`。
- 总索引（三册全部术语，含所属册 / 分类 / 页码）：`05_Index/all_terms_index.md`。
- 每册含封面、版权页、使用说明、目录、正文、中英文索引、后记。
- 构建管线：`build/data_v*.py`（结构化数据真源）→ `build.py` → `render.py`。

### 设计
- 四套低饱和分类主题色（产品/商业=橙，开发/数据=蓝，部署/安全=绿，AI/GitHub=紫）。
- 字体：Noto Sans CJK SC（中文）、Inter（英文）、DejaVu Sans Mono（代码）。
- 每页最多 2–3 个强调色，米白/浅灰/黑为主，留白充足。

### 说明
- 目录与索引在术语较多时自动分页，避免内容裁切。
- 可作为 AI Product Clarifier Skill 的知识底座。

## [Unreleased]
- 计划：拼音精确排序的中文索引；更多术语补充；可选深浅主题。
