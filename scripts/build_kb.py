"""Build server/data/kb.json from the curated segments and the coordinator's written answers.

usage: python scripts/build_kb.py <qa_flat.json>

qa_flat.json comes from scripts/extract_sources.py and stays OUTSIDE the repo,
because the student questions in it contain personal details. Only the answers
are read here, and they are sanitised before anything is written.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COORD_EMAIL = "augustus@miva.university"

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
GREETING_RE = re.compile(r"^(hello|hi|dear)\s+[A-Za-z]+,\s*", re.I)
SIGNOFF_RE = re.compile(r"\s*best wishes,?\s*$", re.I)
THANKS_RE = re.compile(r"^thank you for reaching out to me regarding your siwes\.\s*", re.I)


def sanitise(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    text = GREETING_RE.sub("", text)
    text = THANKS_RE.sub("", text)
    text = SIGNOFF_RE.sub("", text)
    text = EMAIL_RE.sub(lambda m: COORD_EMAIL if "miva" in m.group(0).lower() else "[email]", text)
    text = text.replace("contact @", "contact your success advisor")
    return text.strip()


def main() -> None:
    qa = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    cur = json.loads((ROOT / "data/source/segments.curated.json").read_text(encoding="utf-8"))
    fmap = json.loads((ROOT / "data/source/faq-map.json").read_text(encoding="utf-8"))
    by_seg = {s["id"]: s for s in cur["segments"]}
    for s in cur["segments"]:
        s["faqs"] = []
    seen = set()
    for item in fmap:
        if item["seg"] not in by_seg:
            raise SystemExit(f"unknown segment {item['seg']}")
        key = (item["seg"], item["idx"])
        if key in seen:
            raise SystemExit(f"duplicate faq {key}")
        seen.add(key)
        answer = sanitise(qa[item["idx"]][2])
        if len(answer) < 3:
            raise SystemExit(f"empty answer at {item['idx']}")
        by_seg[item["seg"]]["faqs"].append({"q": item["q"], "a": answer, "src": "sheet"})

    out = ROOT / "data/segments"
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.json"):
        old.unlink()
    for s in cur["segments"]:
        (out / f"{s['id']}.json").write_text(json.dumps(s, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    kb = {k: cur[k] for k in ("version", "note", "glossary", "groups", "segments")}
    (ROOT / "server/data/kb.json").write_text(json.dumps(kb, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"segments={len(cur['segments'])} faqs={len(seen)}")


if __name__ == "__main__":
    main()
