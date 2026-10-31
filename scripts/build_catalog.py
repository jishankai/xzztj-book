#!/usr/bin/env python3
"""Regenerate the committed catalog with: python3 scripts/build_catalog.py.

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


ROOT = Path(__file__).resolve().parent.parent
YEAR = re.compile(r"(?P<reign>.+?)(?:元|[一二三四五六七八九十百]+)年")
LONG_EMPEROR = re.compile(r"^(?P<name>.+)(?:皇帝|帝德)(?P<period>.+)$")
SHORT_EMPEROR = re.compile(r"^(?P<name>.*?帝[\ue000-\uf8ff]?)(?P<period>.+)$")


def metadata(volume_id, source):
    text = source.read_text(encoding="utf-8")
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
    # Parse every source before touching the ready-to-serve catalog.
    rows = [metadata(volume_id, volumes / f"{volume_id}.txt")
            for volume_id in expected]
    destination = ROOT / "assets" / "catalog.json"
    destination.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(rows)} volumes to {destination}")
    for index in (0, 109, 186, 219):
        print(json.dumps(rows[index], ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except (OSError, UnicodeError, ValueError) as error:
        print(f"Catalog generation failed: {error}", file=sys.stderr)
        sys.exit(1)
