#!/usr/bin/env python3
"""Regenerate catalog, reading pages, and sitemap: python3 scripts/build_catalog.py.

No build is needed to serve the site. Paths are relative to this script, not the
working directory. Titles and periods are extracted only from each source's
first ○ or ◎ heading; ◎ headings do not supply an emperor, so none is inferred.
Source spellings (including unusual characters) are intentionally preserved.
`characters` counts every non-whitespace Unicode code point in the entire file,
including its volume label, headings, punctuation, and paragraph numbering.
"""

import json
from pathlib import Path
import re
import sys

from build_pages import build_site


ROOT = Path(__file__).resolve().parent.parent
YEAR = re.compile(r"(?P<reign>.+?)(?:元|[一二三四五六七八九十百]+)年")
LONG_EMPEROR = re.compile(r"^(?P<name>.+)(?:皇帝|帝德)(?P<period>.+)$")
SHORT_EMPEROR = re.compile(r"^(?P<name>.*?帝[\ue000-\uf8ff]?)(?P<period>.+)$")


def metadata(volume_id, source, text):
    heading = next(
        (line.strip() for line in text.splitlines()
         if line.lstrip().startswith(("○", "◎"))),
        None,
    )
    if heading is None:
        raise ValueError(f"{source}: missing expected ○ or ◎ heading")

    body = heading[1:].strip()
    emperor = ""
    period = body
    if heading.startswith("○"):
        match = LONG_EMPEROR.fullmatch(body)
        if match:
            # Long posthumous titles begin with the source's two-character name.
            emperor = match["name"][:2]
            period = match["period"]
        else:
            match = SHORT_EMPEROR.fullmatch(body)
            if match:
                emperor = match["name"]
                period = match["period"]

    year = YEAR.match(period)
    if not year:
        raise ValueError(f"{source}: cannot extract reign/year from {heading!r}")
    if "（" in heading and not heading.endswith("）"):
        raise ValueError(f"{source}: incomplete heading {heading!r}")
    title = " · ".join(part for part in (emperor, year["reign"]) if part)
    return {
        "id": volume_id,
        "title": title,
        "period": period,
        "heading": heading,
        "characters": sum(not character.isspace() for character in text),
    }


def main():
    volumes = ROOT / "txt" / "volumes"
    expected = [f"{number:03d}" for number in range(1, 221)]
    actual = {source.stem for source in volumes.glob("*.txt")}
    missing = [volume_id for volume_id in expected if volume_id not in actual]
    unexpected = sorted(actual - set(expected))
    if missing or unexpected:
        raise ValueError(
            f"{volumes}: expected exactly 001.txt through 220.txt; "
            f"missing: {', '.join(missing) or 'none'}; "
            f"unexpected: {', '.join(unexpected) or 'none'}"
        )
    # Read and validate every source before touching ready-to-serve site files.
    sources = {volume_id: volumes / f"{volume_id}.txt" for volume_id in expected}
    sources["full"] = ROOT / "txt" / "新续资治通鉴.txt"
    texts = {}
    for volume_id, source in sources.items():
        with source.open(encoding="utf-8", newline="") as stream:
            text = stream.read()
        if not text.strip():
            raise ValueError(f"{source}: empty source text")
        texts[volume_id] = text
    rows = [metadata(volume_id, sources[volume_id], texts[volume_id])
            for volume_id in expected]
    raw_sources = sorted((ROOT / 'txt' / 'raw').glob('[0-9][0-9][0-9]_*.txt'))
    if len(raw_sources) != 220 or [p.name[:3] for p in raw_sources] != expected:
        raise ValueError('txt/raw: expected exactly 220 files numbered 001 through 220')
    raw_texts = {}
    raw_rows = []
    for volume_id, source in zip(expected, raw_sources):
        text = source.read_text(encoding='utf-8')
        if not text.strip():
            raise ValueError(f'{source}: empty source text')
        raw_texts[volume_id] = text
        item = metadata(volume_id, source, text)
        item['source'] = source.relative_to(ROOT).as_posix()
        raw_rows.append(item)
    outputs = build_site(rows, texts, raw_rows, raw_texts)
    outputs[ROOT / 'assets' / 'catalog-raw.json'] = json.dumps(raw_rows, ensure_ascii=False, indent=2) + '\n'
    destination = ROOT / "assets" / "catalog.json"
    outputs[destination] = json.dumps(rows, ensure_ascii=False, indent=2) + "\n"
    for path, content in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8", newline="") as stream:
            stream.write(content)
    print(f"Wrote {len(rows)} volumes to {destination}")
    print("Wrote 441 static reading pages, homepage catalog, and sitemap (442 URLs)")
    for index in (0, 109, 186, 219):
        print(json.dumps(rows[index], ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except (OSError, UnicodeError, ValueError) as error:
        print(f"Catalog generation failed: {error}", file=sys.stderr)
        sys.exit(1)
