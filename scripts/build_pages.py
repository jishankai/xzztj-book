"""Prepare dependency-free reading pages and sitemap for build_catalog.py."""

from html import escape
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "https://jishankai.github.io/xzztj-book/"
BOOK = "新续资治通鉴"
AUTHORS = "清 · 毕沅 原著 / 季善凯 重编"
SHARE_IMAGE = BASE_URL + "assets/share-cover.png"
SHARE_IMAGE_ALT = "新续资治通鉴，清·毕沅 原著 / 季善凯 重编，110 卷重编本，宋 · 辽 · 金 · 元，在线阅读 · TXT / PDF"
# Match JavaScript's whitespace and renderText classification in assets/app.js.
JS_WHITESPACE = "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
SPACE = "[" + JS_WHITESPACE + "]"
PARAGRAPH_BREAK = re.compile(r"\r?\n" + SPACE + r"*\r?\n")
HEADING = re.compile(
    r"^[○◎]|^新续资治通鉴(?:" + SPACE + r"|$)|^(?:序|凡例|目录)$|^(?:宋|辽|金|元)纪.{0,40}$"
)
CATALOG = re.compile(
    r"(?P<opening><div\b[^>]*\bid=[\"']catalog-list[\"'][^>]*>)"
    r"(?P<content>.*?)"
    r"(?P<closing></div\s*>)",
    re.DOTALL,
)


def reading_body(text, original=False):
    """Return the same text blocks and heading anchors as the enhanced reader."""
    if text.startswith("\ufeff"):
        text = text[1:]
    body = []
    outline = []
    for raw in (text.splitlines() if original else PARAGRAPH_BREAK.split(text)):
        paragraph = raw.strip(JS_WHITESPACE)
        if not paragraph:
            continue
        if "\n" not in paragraph and (HEADING.search(paragraph) or original and re.match(r'^(?:续资治通鉴|●卷|【)', paragraph)):
            anchor = f"reader-section-{len(outline)}"
            body.append(
                f'<h3 class="reader-heading" id="{anchor}">{escape(paragraph)}</h3>'
            )
            outline.append(f'<li><a href="#{anchor}">{escape(paragraph)}</a></li>')
        else:
            body.append(f'<p class="reader-paragraph">{escape(paragraph)}</p>')
    return "\n".join(body), "\n".join(outline)


def pagination(volume_id, position, prefix='../', translated=None):
    links = []
    if volume_id != "full":
        number = int(volume_id)
        if number > 1:
            target = f'{number - 1:03d}'
            pending = translated is not None and target not in translated
            links.append(
                f'<a href="{"../" if pending else ""}{target}.html" rel="prev">← 上一卷 {target}{"（文言，白话文待译）" if pending else ""}</a>'
            )
    links.append(f'<a href="{prefix}#volumes">返回分卷目录</a>')
    if volume_id != "full" and number < 220:
        target = f'{number + 1:03d}'
        pending = translated is not None and target not in translated
        links.append(
            f'<a href="{"../" if pending else ""}{target}.html" rel="next">下一卷 {target}{"（文言，白话文待译）" if pending else ""} →</a>'
        )
    return (
        f'<nav class="static-pagination" aria-label="{position}阅读导航">'
        + "\n".join(links)
        + "</nav>"
    )


def reading_page(volume_id, text, item=None, original=False, vernacular=False, translated=None):
    full = volume_id == "full"
    prefix = '../../' if original or vernacular else '../'
    book = '续资治通鉴' if original else BOOK
    authors = '清 · 毕沅 原著' if original else AUTHORS
    edition = '原版 220 卷' if original else ("110 卷新编本" if full else "新编版 · 220 卷")
    if vernacular:
        edition = '白话译文 · 220 卷分卷 · AI 辅助翻译，待人工校对'
    label = "全书重编本（110 卷）" if full else f"卷 {volume_id} · {item['title']}"
    title = f"{book} · {label} · {edition}"
    source = item['source'] if original else ("txt/新续资治通鉴.txt" if full else f"txt/volumes/{volume_id}.txt")
    if vernacular:
        source = f'txt/vernacular/{volume_id}.txt'
    warning = (
        "本页为季善凯重编的 110 卷全书，含序、凡例、正文及脚注；"
        "与按原书 220 卷卷界组织的分卷文本不一一对应。"
        if full else
        "本页按原书 220 卷卷界组织，并非重编本的同号卷；"
        "与季善凯重编的 110 卷全书不一一对应。"
    )
    if original:
        warning = '本页为 txt/raw 所载毕沅《续资治通鉴》原版文本，保留来源用字及纪年，未经校订；可切换至同一原书卷界的新编分卷，非 110 卷新编全书的同号卷。'
    if vernacular:
        warning = '本页依据 txt/volumes 同卷文本逐段翻译，保留编号、纪年标题及专名；为 AI 辅助白话译文，尚待人工校对，不替代原文，不据其他史料改写来源疑误。'
    description = f"《{book}》{label}。{authors}。{warning}在线阅读完整正文，提供篇章目录和原始 TXT。"
    document_prefix = 'raw/' if original else 'vernacular/' if vernacular else ''
    canonical = f"{BASE_URL}read/{document_prefix}{volume_id}.html"
    body, outline = reading_body(text, original)
    switch = (f'../{volume_id}.html' if original else f'raw/{"001" if full else volume_id}.html')
    switch_label = '切换到新编版（同卷界）' if original else '切换到原版（同卷界）'
    switch_control = '' if full else (
        f'<a class="edition-switch" href="{switch}" aria-label="{switch_label}" '
        f'title="{switch_label}"><span aria-hidden="true">⇄</span></a>'
    )
    language_control = ''
    if not full:
        if vernacular:
            switch_control = ''
            language_control = f'<a class="icon-button language-switch" href="../{volume_id}.html" aria-label="切换到文言原文" title="切换到文言原文"><span aria-hidden="true">文⇄白</span></a>'
        elif volume_id in (translated or set()):
            language_control = f'<a class="icon-button language-switch" href="{"../" if original else ""}vernacular/{volume_id}.html" aria-label="切换到白话文（新编分卷译文）" title="切换到白话文（新编分卷译文）"><span aria-hidden="true">文⇄白</span></a>'
        else:
            language_control = '<span class="static-meta">白话文待译（新编分卷）</span>'
    period = (
        '<p class="static-meta">版本：110 卷重编全书 · 含序、凡例及脚注</p>'
        if full else
        f'<p class="static-meta">版本：{edition} · {escape(item["period"])}</p>'
    )
    return f'''<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f6f5ef">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(description)}">
  <meta name="author" content="毕沅；季善凯">
  <link rel="canonical" href="{canonical}">
  <meta property="og:title" content="{escape(title)}">
  <meta property="og:description" content="{escape(description)}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:site_name" content="{BOOK}">
  <meta property="og:locale" content="zh_CN">
  <meta property="og:type" content="article">
  <meta property="og:image" content="{SHARE_IMAGE}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{escape(SHARE_IMAGE_ALT)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{escape(title)}">
  <meta name="twitter:description" content="{escape(description)}">
  <meta name="twitter:image" content="{SHARE_IMAGE}">
  <meta name="twitter:image:alt" content="{escape(SHARE_IMAGE_ALT)}">
  <link rel="stylesheet" href="{prefix}assets/style.css">
  <script src="{prefix}assets/share.js" defer></script>
</head>
<body class="static-reading">
  <main class="static-main">
    <header class="static-title">
      <p class="eyebrow"><a href="{prefix}">{book}</a> / 静态全文阅读</p>
      <div class="static-heading"><h1>{escape(label)}</h1>{switch_control}</div>
      <p class="static-meta">{authors}</p>
      {period}
      <p class="static-meta">版本提示：{warning}</p>
    </header>
    <nav class="static-actions" aria-label="阅读方式">
      <a class="icon-button" href="{prefix}#volumes" aria-label="回到分卷目录" title="回到分卷目录"><span aria-hidden="true">☷</span></a>
      <a href="{prefix}#read/{document_prefix}{volume_id}">使用增强阅读器</a>{chr(10) + '      ' + language_control if language_control else ''}
      <a href="{prefix}{escape(source)}" download>下载原始 TXT</a>
      <a href="{prefix}read/{'001.html' if full else 'full.html'}">{'阅读新编版分卷文本' if full else '阅读 110 卷新编全书'}</a>
    </nav>
    <div class="share-tools" data-share="page">
      <button type="button" data-share-native aria-label="分享当前正文" title="分享当前正文" hidden><span aria-hidden="true">↥</span></button>
      <button type="button" data-share-copy aria-label="复制当前正文链接" title="复制当前正文链接" hidden><span aria-hidden="true">⧉</span></button>
      <p class="share-status" role="status"></p>
      <input class="share-url" aria-label="可复制的分享链接" readonly hidden>
    </div>
    {pagination(volume_id, '页首', prefix, translated if vernacular else None)}
    <details class="static-outline">
      <summary>篇章 / 年代目录</summary>
      <ol>
{outline}
      </ol>
    </details>
    <article class="static-body" aria-label="书籍正文">
{body}
    </article>
    {pagination(volume_id, '页末', prefix, translated if vernacular else None)}
  </main>
</body>
</html>
'''


def homepage_catalog(index_html, rows):
    matches = list(CATALOG.finditer(index_html))
    if len(matches) != 1:
        raise ValueError("index.html: expected one catalog-list container")
    match = matches[0]
    # This generator owns only the existing anchors, never surrounding homepage HTML.
    existing = match["content"]
    anchor = re.compile(r"<a\b[^>]*>.*?</a\s*>", re.DOTALL)
    if len(anchor.findall(existing)) != len(rows) or anchor.sub("", existing).strip():
        raise ValueError("index.html: catalog-list must contain only 220 anchors")
    cards = []
    for item in rows:
        volume_id = item["id"]
        cards.append(
            f'          <a class="volume-card" data-volume="{volume_id}" '
            f'data-read="{volume_id}" data-title="{escape(item["title"])}" '
            f'data-period="{escape(item["period"])}" data-heading="{escape(item["heading"])}" '
            f'data-characters="{item["characters"]}" href="read/{volume_id}.html" '
            f'title="{escape(item["heading"])}">'
            f'<span class="volume-number">卷 {volume_id}</span>'
            f'<strong class="volume-title">{escape(item["title"])}</strong>'
            f'<span class="volume-period">{escape(item["period"])}</span>'
            '<span class="volume-arrow" aria-hidden="true">↗</span></a>'
        )
    return (
        index_html[:match.start("content")]
        + "\n" + "\n".join(cards) + "\n      "
        + index_html[match.end("content"):]
    )


def build_site(rows, texts, raw_rows, raw_texts):
    """Prepare every output before the entrypoint writes any generated files."""
    translations = {}
    for source in sorted((ROOT / 'txt' / 'vernacular').glob('*.txt')):
        volume_id = source.stem
        if volume_id not in texts or volume_id == 'full':
            raise ValueError(f'{source}: expected a volume ID from 001 through 220')
        text = source.read_text(encoding='utf-8')
        # Reject missing/extra/reordered paragraphs and altered chronology headings.
        # This is a structural guard, not a substitute for editorial review.
        def structure(value):
            return re.findall(r'^\s*(\d+)\.', value, re.MULTILINE), re.findall(r'^[○◎].*$', value, re.MULTILINE)
        if not text.strip() or structure(text) != structure(texts[volume_id]):
            raise ValueError(f'{source}: paragraph numbering or chronology headings differ from source')
        translations[volume_id] = text
    translated = set(translations)
    with (ROOT / "index.html").open(encoding="utf-8", newline="") as source:
        index_html = source.read()
    outputs = {ROOT / "index.html": homepage_catalog(index_html, rows)}
    outputs[ROOT / 'assets' / 'vernacular.json'] = json.dumps(sorted(translated), ensure_ascii=False, indent=2) + '\n'
    for item in rows:
        volume_id = item["id"]
        outputs[ROOT / "read" / f"{volume_id}.html"] = reading_page(
            volume_id, texts[volume_id], item, translated=translated
        )
        if volume_id in translated:
            outputs[ROOT / 'read' / 'vernacular' / f'{volume_id}.html'] = reading_page(
                volume_id, translations[volume_id], item, vernacular=True, translated=translated
            )
    outputs[ROOT / "read" / "full.html"] = reading_page("full", texts["full"])
    for item in raw_rows:
        volume_id = item['id']
        outputs[ROOT / 'read' / 'raw' / f'{volume_id}.html'] = reading_page(volume_id, raw_texts[volume_id], item, original=True, translated=translated)
    paths = [""] + [f'read/{item["id"]}.html' for item in rows] + ["read/full.html"]
    paths += [f'read/raw/{item["id"]}.html' for item in raw_rows]
    paths += [f'read/vernacular/{volume_id}.html' for volume_id in sorted(translated)]
    urls = "\n".join(f"  <url><loc>{escape(BASE_URL + path)}</loc></url>" for path in paths)
    outputs[ROOT / "sitemap.xml"] = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + urls + "\n</urlset>\n"
    )
    return outputs
