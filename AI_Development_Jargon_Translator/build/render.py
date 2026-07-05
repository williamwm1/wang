#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""用 Playwright/Chromium 把 HTML 书籍渲染为 A4 PDF。"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
JOBS = [
    ("volume_01_book.html", "AI开发黑话翻译手册_第一册_AI产品基础.pdf"),
    ("volume_02_book.html", "AI开发黑话翻译手册_第二册_AI开发与部署.pdf"),
    ("volume_03_book.html", "AI开发黑话翻译手册_第三册_AI编程与GitHub.pdf"),
]

async def main():
    src = ROOT / "03_Book_Source"
    out = ROOT / "04_Output_PDF"
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
        page = await browser.new_page()
        for html_name, pdf_name in JOBS:
            url = (src / html_name).resolve().as_uri()
            await page.goto(url, wait_until="networkidle")
            await page.emulate_media(media="print")
            await page.pdf(
                path=str(out / pdf_name),
                width="210mm", height="297mm",
                print_background=True,
                prefer_css_page_size=True,
                margin={"top":"0","bottom":"0","left":"0","right":"0"},
            )
            print(f"PDF -> 04_Output_PDF/{pdf_name}")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
