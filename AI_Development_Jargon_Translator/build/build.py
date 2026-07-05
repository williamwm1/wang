#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
构建脚本：从结构化术语数据生成
  - 01_Source/*.md      （术语源文件 · Markdown）
  - 03_Book_Source/*.html（书籍源文件 · HTML）
  - 05_Index/all_terms_index.md（总索引）
再由 render.py 用 Playwright 渲染为 PDF。
"""
import html, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "build"))

from data_v1 import VOL as V1
from data_v2 import VOL as V2
from data_v3 import VOL as V3
VOLUMES = [V1, V2, V3]

# 分类 -> 主题
CAT_THEME = {
    "产品": "t-orange", "商业": "t-orange",
    "开发": "t-blue",   "数据": "t-blue",
    "部署": "t-green",  "安全": "t-green",
    "AI": "t-purple",   "GitHub": "t-purple",
}
def theme(cat): return CAT_THEME.get(cat, "t-blue")

E = lambda s: html.escape(str(s))

FIELDS = ["one_line","life","programmer","ai_translate",
          "when_need","when_not","without","tell_ai","mnemonic"]

def as_dict(t):
    zh, en, cat, ico = t[0], t[1], t[2], t[3]
    d = dict(zip(FIELDS, t[4:]))
    d.update(zh=zh, en=en, cat=cat, ico=ico)
    return d

# ---------------------------------------------------------------- HTML pieces
def cover_html(vol):
    return f'''<section class="page cover {theme(vol["accent_cat"])}">
  <div class="cover-top">
    <div class="cover-kicker">AI Development<br>Jargon Translator</div>
    <div class="cover-kicker" style="text-align:right">卷 {vol["num"]} / 3</div>
  </div>
  <div>
    <div class="cover-geo"><span class="c1"></span><span class="c2"></span><span class="c3"></span></div>
    <h1 class="cover-title">AI 开发<br>黑话翻译手册</h1>
    <div class="cover-vol">第{vol["num_zh"]}册 ｜ {E(vol["subtitle"])}</div>
    <div class="cover-sub">程序员是怎么说的，普通人应该怎么理解。<br>把黑话翻译成人话，再翻译成 AI 能执行的开发需求。</div>
  </div>
  <div class="cover-foot">
    <span>{E(vol["term_count"])} 个术语 · 一词一页 · 可打印</span>
    <span class="en">Open Source · CC BY 4.0</span>
  </div>
</section>'''

def copyright_html(vol):
    return f'''<section class="page doc {theme(vol["accent_cat"])}">
  <div class="color-bar"></div>
  <div class="kicker">版权信息 · Colophon</div>
  <h1>AI 开发黑话翻译手册</h1>
  <p class="lead">第{vol["num_zh"]}册 ｜ {E(vol["subtitle"])}</p>
  <hr class="rule">
  <p><strong>书名</strong><br>AI 开发黑话翻译手册（AI Development Jargon Translator）</p>
  <p><strong>副标题</strong><br>程序员是怎么说的，普通人应该怎么理解</p>
  <p><strong>本册</strong><br>第{vol["num_zh"]}册 · {E(vol["subtitle"])} · 共 {vol["term_count"]} 个术语</p>
  <p><strong>版本</strong><br>v1.0 · 2026 年</p>
  <p><strong>许可</strong><br>本手册以 <span class="mono">CC BY 4.0</span> 协议开源，可自由分享、打印、用于学习与教学，注明出处即可。</p>
  <hr class="rule">
  <p class="muted">本手册面向完全不懂技术的读者。所有解释都尽量用生活语言，不用黑话解释黑话。它同时是 “AI Product Clarifier” 技能的知识底座：当用户表示 “我不太理解” 时，可引用本手册中的解释。</p>
  <div class="pfoot"><span>AI 开发黑话翻译手册 · 第{vol["num_zh"]}册</span><span></span></div>
</section>'''

def howto_html(vol):
    legend = [
        ("①","分类标签","页面右上角，标明这个词属于产品 / 开发 / 部署 / AI 等哪一类。"),
        ("②","中文术语","页面最大的字，就是这一页要讲的黑话。"),
        ("③","英文术语","黑话的英文原文，方便你在真实软件里对照。"),
        ("④","一句话理解","整页最重要的一句。看不懂别的，看这句就够。"),
        ("⑤","生活中的例子","用你熟悉的日常事物，帮你秒懂。"),
        ("⑥","程序员想表达什么","这个词在开发里到底指什么。"),
        ("⑦","AI 会翻译成什么","你说人话，AI 实际会去做的开发动作。"),
        ("⑧","什么时候需要 / 不需要","帮你判断这东西你到底要不要。"),
        ("⑨","没有它会怎样","不做的后果，帮你权衡。"),
        ("⑩","怎么告诉 AI","可以直接复制给 AI 的一句话。"),
        ("⑪","记忆口诀","一句话记住它。"),
    ]
    rows = "".join(
        f'<div class="legend-item"><span class="n">{n}</span>'
        f'<span class="l">{E(l)}</span><span class="d">{E(d)}</span></div>'
        for n,l,d in legend)
    return f'''<section class="page doc {theme(vol["accent_cat"])}">
  <div class="color-bar"></div>
  <div class="kicker">使用说明 · How to Read</div>
  <h1>怎么读这本书</h1>
  <p class="lead">这不是词典，是翻译器。每一页把一个技术黑话，翻译成你听得懂的话，再翻译成 AI 能执行的开发需求。</p>
  <p>你不需要从头读到尾。遇到听不懂的词，翻到那一页，看一眼「一句话理解」，通常就够了。想更深入，再往下看例子和用法。</p>
  <h2>每一页长这样</h2>
  <div class="legend">{rows}</div>
  <p class="muted" style="margin-top:5mm">翻译逻辑：<strong>程序员语言 → 普通人语言 → AI 能执行的开发需求语言</strong>。</p>
  <div class="pfoot"><span>AI 开发黑话翻译手册 · 第{vol["num_zh"]}册</span><span>使用说明</span></div>
</section>'''

def _chunk(items, cap):
    """把列表按每页上限 cap 均衡切分成若干页。"""
    import math
    n = max(1, math.ceil(len(items) / cap))
    per = math.ceil(len(items) / n)
    return [items[i:i+per] for i in range(0, len(items), per)]

def toc_html(vol, terms):
    pages = []
    chunks = _chunk(list(enumerate(terms, 1)), 60)
    for pi, chunk in enumerate(chunks):
        rows = ""
        for i, d in chunk:
            rows += (f'<div class="toc-row"><span class="idx">{i:02d}</span>'
                     f'<span class="zh">{E(d["zh"])}</span>'
                     f'<span class="en">{E(d["en"])}</span>'
                     f'<span class="dots"></span>'
                     f'<span class="pg">{i:03d}</span></div>')
        head = ('<div class="kicker">目录 · Contents</div><h1>目录</h1>' if pi == 0
                else '<div class="kicker">目录 · Contents（续）</div><h1>目录 <span style="font-size:15pt;color:var(--gray)">（续）</span></h1>')
        pages.append(f'''<section class="page toc {theme(vol["accent_cat"])}">
  <div class="color-bar"></div>
  {head}
  <div class="toc-cols">{rows}</div>
  <div class="pfoot"><span>AI 开发黑话翻译手册 · 第{vol["num_zh"]}册</span><span>目录</span></div>
</section>''')
    return "\n".join(pages)

def term_html(vol, d, page):
    return f'''<section class="page term {theme(d["cat"])}">
  <div class="color-bar"></div>
  <span class="term-tag">{E(d["cat"])}</span>
  <div class="term-head">
    <h2 class="term-zh">{E(d["zh"])}</h2>
    <div class="term-en">{E(d["en"])}</div>
  </div>
  <div class="core">
    <div class="ico">{d["ico"]}</div>
    <div class="core-body">
      <div class="lbl">一句话理解</div>
      <div class="txt">{E(d["one_line"])}</div>
    </div>
  </div>
  <div class="mod"><div class="mh">生活中的例子</div><div class="mb">{E(d["life"])}</div></div>
  <div class="mod"><div class="mh">程序员真正想表达什么</div><div class="mb">{E(d["programmer"])}</div></div>
  <div class="mod"><div class="mh">AI 会翻译成什么开发需求</div><div class="mb">{E(d["ai_translate"])}</div></div>
  <div class="two">
    <div class="col yes"><div class="mh"><span class="s">✓</span>什么时候需要</div><div class="mb">{E(d["when_need"])}</div></div>
    <div class="col no"><div class="mh"><span class="s">✕</span>什么时候不需要</div><div class="mb">{E(d["when_not"])}</div></div>
  </div>
  <div class="mod"><div class="mh">没有它会怎样</div><div class="mb">{E(d["without"])}</div></div>
  <div class="tellai"><div class="mh">小白应该怎么告诉 AI</div><div class="quote">{E(d["tell_ai"])}</div></div>
  <div class="mnemonic">{E(d["mnemonic"])}</div>
  <div class="pfoot"><span>AI 开发黑话翻译手册 · 第{vol["num_zh"]}册 · {E(d["cat"])}</span><span class="pnum">{page:03d}</span></div>
</section>'''

def _idx_rows(items, key_a, key_b):
    s = ""
    for i, d in items:
        s += (f'<div class="idx-row"><span class="a">{E(d[key_a])}</span>'
              f'<span class="b">{E(d[key_b])}</span><span class="dots"></span>'
              f'<span class="pg">{i:03d}</span></div>')
    return s

def index_html(vol, terms):
    by_zh = sorted(enumerate(terms,1), key=lambda x: x[1]["zh"])
    by_en = sorted(enumerate(terms,1), key=lambda x: x[1]["en"].lower())
    sections = [
        ("按中文（拼音 / 笔画大致排序）", by_zh, "zh", "en"),
        ("按英文（A–Z）", by_en, "en", "zh"),
    ]
    pages, first = [], True
    for label, items, ka, kb in sections:
        chunks = _chunk(items, 84)
        for ci, chunk in enumerate(chunks):
            kicker = ('<div class="kicker">索引 · Index</div><h1>术语索引</h1>' if first
                      else '<div class="kicker">索引 · Index（续）</div>')
            first = False
            h2 = f'<h2>{label}{"（续）" if ci>0 else ""}</h2>'
            pages.append(f'''<section class="page index {theme(vol["accent_cat"])}">
  <div class="color-bar"></div>
  {kicker}
  {h2}
  <div class="idx-cols">{_idx_rows(chunk, ka, kb)}</div>
  <div class="pfoot"><span>AI 开发黑话翻译手册 · 第{vol["num_zh"]}册</span><span>索引</span></div>
</section>''')
    return "\n".join(pages)

def afterword_html(vol):
    return f'''<section class="page doc {theme(vol["accent_cat"])}">
  <div class="color-bar"></div>
  <div class="kicker">后记 · Afterword</div>
  <h1>写在最后</h1>
  <p class="lead">黑话不是为了拒人于门外，它只是行业里的省事说法。当你能把它翻译成人话，你就已经能和 AI、和程序员平等对话了。</p>
  <p>这本手册的野心很小：让你在听到一个词时，不再点头假装懂，而是能说出 “哦，原来它就是那个意思”。它的野心也很大：让不懂技术的人，也能用 AI 把想法做成真正的产品。</p>
  <p>如果某个词的解释你觉得还能更清楚，欢迎在 GitHub 上提出。这本书会一直更新。</p>
  <hr class="rule">
  <p class="muted">本册是《AI 开发黑话翻译手册》三册中的第{vol["num_zh"]}册。三册合起来，覆盖从产品想法、到开发部署、再到 AI 编程与 GitHub 的完整旅程。</p>
  <p class="muted">翻译逻辑始终不变：<strong>程序员语言 → 普通人语言 → AI 能执行的开发需求语言。</strong></p>
  <div class="pfoot"><span>AI 开发黑话翻译手册 · 第{vol["num_zh"]}册</span><span>后记</span></div>
</section>'''

# ---------------------------------------------------------------- Markdown
def term_md(d, i):
    return f'''## {i:02d}. {d["zh"]} · {d["en"]}

- **分类**：{d["cat"]}
- **一句话理解**：{d["one_line"]}
- **生活中的例子**：{d["life"]}
- **程序员真正想表达什么**：{d["programmer"]}
- **AI 会翻译成什么开发需求**：{d["ai_translate"]}
- **什么时候需要**：{d["when_need"]}
- **什么时候不需要**：{d["when_not"]}
- **没有它会怎样**：{d["without"]}
- **小白应该怎么告诉 AI**：{d["tell_ai"]}
- **一句记忆口诀**：{d["mnemonic"]}
'''

# ---------------------------------------------------------------- main
def build():
    all_index = []
    for vol in VOLUMES:
        terms = [as_dict(t) for t in vol["terms"]]
        vol["term_count"] = len(terms)

        # HTML
        parts = [
            '<link rel="stylesheet" href="styles.css">',
            cover_html(vol), copyright_html(vol), howto_html(vol), toc_html(vol, terms),
        ]
        for i, d in enumerate(terms, 1):
            parts.append(term_html(vol, d, i))
        parts.append(index_html(vol, terms))
        parts.append(afterword_html(vol))
        html_out = "\n".join(parts)
        (ROOT / "03_Book_Source" / vol["html"]).write_text(html_out, encoding="utf-8")

        # Markdown source
        md = [f'# AI 开发黑话翻译手册 · 第{vol["num_zh"]}册\n',
              f'## 主题：{vol["subtitle"]}\n',
              f'> 共 {len(terms)} 个术语。翻译逻辑：程序员语言 → 普通人语言 → AI 能执行的开发需求语言。\n',
              '\n---\n']
        for i, d in enumerate(terms, 1):
            md.append(term_md(d, i))
            md.append("\n---\n")
        (ROOT / "01_Source" / vol["md"]).write_text("\n".join(md), encoding="utf-8")

        for i, d in enumerate(terms, 1):
            all_index.append((d["zh"], d["en"], vol["num_zh"], d["cat"], i))

        print(f'第{vol["num_zh"]}册 {vol["subtitle"]}: {len(terms)} 个术语 -> {vol["html"]}, {vol["md"]}')

    # 总索引
    header = "# 总索引 · All Terms Index\n\n《AI 开发黑话翻译手册》三册全部术语。\n\n"
    header += "| 中文术语 | 英文术语 | 所属册 | 分类 | 页码 |\n|---|---|---|---|---|\n"
    body = "".join(f"| {zh} | {en} | 第{v}册 | {c} | {p:03d} |\n"
                   for zh,en,v,c,p in all_index)
    total = len(all_index)
    footer = f"\n> 合计 **{total}** 个术语。页码为该术语在所属册内的序号。\n"
    (ROOT / "05_Index" / "all_terms_index.md").write_text(header+body+footer, encoding="utf-8")
    print(f"总索引: {total} 个术语 -> 05_Index/all_terms_index.md")

if __name__ == "__main__":
    build()
