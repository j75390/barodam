"""Build src/data/photos.json: one photo per product, never shared.

Inputs (tools/data/): catalog.json (generated items), cc_items.json (CC0 photos), extras.json (banners).
Images live in public/img/{gen,cc}. Identical or near-identical photos are dropped
(md5 + 64-bit difference hash), and CREDITS.md is regenerated for CC0 photos.

Usage: python tools/build_photos.py
"""
import hashlib
import json
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "tools" / "data"
IMG = ROOT / "public" / "img"


def dhash(path: pathlib.Path) -> int:
    px = list(Image.open(path).convert("L").resize((9, 8)).get_flattened_data()) if hasattr(Image.Image, "get_flattened_data") \
        else list(Image.open(path).convert("L").resize((9, 8)).getdata())
    return sum(1 << i for i in range(64) if px[(i // 8) * 9 + i % 8] > px[(i // 8) * 9 + i % 8 + 1])


def main() -> None:
    catalog = json.loads((DATA / "catalog.json").read_text(encoding="utf8"))
    extras = json.loads((DATA / "extras.json").read_text(encoding="utf8"))
    cc = json.loads((DATA / "cc_items.json").read_text(encoding="utf8"))
    cc_assigned = set(json.loads((DATA / "cc_assigned.json").read_text(encoding="utf8")))

    seen_md5: set[str] = set()
    hashes: list[int] = []
    items, credits, skipped = [], [], []

    def accept(path: pathlib.Path, similar_check: bool) -> bool:
        # Generated studio shots share plain backgrounds, so a 64-bit difference hash
        # flags different products as "similar". Only exact copies are rejected for them;
        # CC0 photos (where re-uploads of the same picture happen) also get the similarity check.
        h = hashlib.md5(path.read_bytes()).hexdigest()
        d = dhash(path)
        if h in seen_md5 or (similar_check and any(bin(d ^ x).count("1") <= 6 for x in hashes)):
            return False
        seen_md5.add(h)
        hashes.append(d)
        return True

    for e in catalog:
        p = IMG / "gen" / e["f"]
        if not p.exists() or e["f"] in cc_assigned:
            continue
        if not accept(p, similar_check=False):
            skipped.append("gen/" + e["f"])
            continue
        items.append({"f": "gen/" + e["f"], "type": e["type"], "name": e["name"], "brand": e["brand"], "color": e["color"]})

    for e in cc:
        p = IMG / e["f"]
        if not p.exists():
            continue
        if not accept(p, similar_check=True):
            skipped.append(e["f"])
            continue
        items.append({k: e[k] for k in ("f", "type", "name", "brand", "color")})
        credits.append((e["f"], e.get("title", ""), e.get("by", ""), e.get("src", "")))

    reserved = {x["key"]: "gen/" + x["f"] for x in extras if (IMG / "gen" / x["f"]).exists()}
    out = ROOT / "src" / "data" / "photos.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"items": items, "reserved": reserved}, ensure_ascii=False), encoding="utf8")

    lines = ["# 사진 출처", "", "- `public/img/gen/`: Codex(OpenAI) 이미지 생성으로 만든 사진",
             "- `public/img/cc/`: Openverse에서 찾은 CC0(퍼블릭 도메인) 사진. 사진 속 상품명·브랜드와 사이트의 상품 정보는 관계없어요.",
             "- `public/img/careers/`: StockSnap CC0 사진", ""]
    lines += [f"- `{f}` {t or '(제목 없음)'}{' / ' + b if b else ''} — {u}" for f, t, b, u in credits]
    (ROOT / "CREDITS.md").write_text("\n".join(lines) + "\n", encoding="utf8")
    print(f"photos.json: {len(items)} products, {len(reserved)} reserved; skipped duplicates: {skipped}")


if __name__ == "__main__":
    main()
