"""Pull the raw sources into a private working folder (never inside the repo).

usage: python scripts/extract_sources.py <xlsx path> <video id> <out dir>

needs: pip install openpyxl youtube-transcript-api
Writes <out>/qa_flat.json ([sheet, question, answer]) and <out>/transcript.json.
The xlsx answers live on the answer sheets (the main sheet's answer column is
empty and the answer sheets join to it by formula), so read with data_only=True
and take every sheet.
"""
import json
import re
import sys
from pathlib import Path

import openpyxl
from youtube_transcript_api import YouTubeTranscriptApi


def norm(v) -> str:
    return re.sub(r"\s+", " ", str(v)).strip() if v is not None else ""


def main() -> None:
    xlsx, video, out = sys.argv[1], sys.argv[2], Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.load_workbook(xlsx, data_only=True)
    flat = []
    for ws in wb.worksheets:
        for row in ws.iter_rows(values_only=True):
            cells = [norm(c) for c in row if norm(c)]
            if len(cells) >= 2:
                flat.append([ws.title, cells[-2], cells[-1]])
    (out / "qa_flat.json").write_text(json.dumps(flat, ensure_ascii=False), encoding="utf-8")
    segs = YouTubeTranscriptApi().fetch(video).to_raw_data()
    (out / "transcript.json").write_text(json.dumps(segs, ensure_ascii=False), encoding="utf-8")
    print(len(wb.worksheets), "sheets,", len(flat), "rows,", len(segs), "caption segments")


if __name__ == "__main__":
    main()
