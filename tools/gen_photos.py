"""Generate studio product photos (Codex image tool) for products that still use CC0 lifestyle photos.

CC0 photos often showed people, scenery or real brand logos instead of the product, so every product
gets a clean e-commerce shot that matches its name. Output: public/img/gen/<same file name>.jpg (480x480),
so product IDs (taken from the file number) stay the same.

Usage: python tools/gen_photos.py [batch_size]
"""
import json
import pathlib
import shutil
import subprocess
import sys
import time

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "tools" / "data"
OUT = ROOT / "public" / "img" / "gen"
WORK = pathlib.Path.home() / "Documents" / "barodam-gen"
RAW = WORK / "raw"
RAW.mkdir(parents=True, exist_ok=True)
CODEX = shutil.which("codex") or shutil.which("codex.cmd")

COLORS = ["black", "ivory", "charcoal grey", "navy", "beige", "olive", "white", "sage green", "brown", "sky blue"]
VIEWS = ["front view", "three-quarter view", "slightly elevated angle"]
BACKS = ["white seamless background", "warm beige seamless background", "light grey seamless studio background", "soft pastel background"]
NOUN = [
    ("노이즈캔슬링 무선 헤드폰", "over-ear wireless noise cancelling headphones"),
    ("모니터 헤드폰", "wired studio monitor headphones with coiled cable"),
    ("스마트워치", "smartwatch with a blank dark screen and silicone strap"),
    ("스마트밴드", "slim fitness tracker band with a blank screen"),
    ("메탈 손목시계", "analog wristwatch with metal bracelet and plain dial"),
    ("방수 블루투스 스피커", "portable waterproof bluetooth speaker"),
    ("북쉘프 스피커", "pair of wooden bookshelf speakers"),
    ("도자기 머그컵", "ceramic mug"),
    ("이중 유리 머그", "double-wall glass mug with coffee"),
    ("무드등 스탠드", "small table mood lamp with fabric shade, lit"),
    ("톤업 선크림", "sunscreen tube with blank label"),
    ("시카 크림", "skincare cream jar with blank label"),
]


def prompt_for_extra(e: dict, i: int) -> str:
    noun = next((en for ko, en in NOUN if ko in e["name"]), e["type"])
    return (f"Square e-commerce product photo of a {COLORS[i % len(COLORS)]} {noun}, {VIEWS[i % 3]}, {BACKS[i % 4]}, "
            "soft natural studio lighting, realistic, high detail, no text, no watermark, no real brand logos, no people")


def jobs() -> list[dict]:
    catalog = {e["f"]: e for e in json.loads((DATA / "catalog.json").read_text(encoding="utf8"))}
    cc = json.loads((DATA / "cc_items.json").read_text(encoding="utf8"))
    out = []
    for i, e in enumerate(cc):
        name = e["f"].split("/")[-1]
        if name in catalog:
            out.append({"f": name, "prompt": catalog[name]["prompt"]})
        elif name.startswith("x"):
            out.append({"f": name, "prompt": prompt_for_extra(e, i)})
    return out


def convert(todo: list[dict]) -> int:
    n = 0
    for e in todo:
        raw, out = RAW / (pathlib.Path(e["f"]).stem + ".png"), OUT / e["f"]
        if raw.exists() and not out.exists():
            try:
                im = Image.open(raw).convert("RGB")
                w, h = im.size
                s = min(w, h)
                im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))
                im.resize((480, 480), Image.LANCZOS).save(out, quality=82, optimize=True)
                n += 1
            except Exception as ex:  # keep going; a broken file is retried next round
                print("convert fail", raw, ex, flush=True)
                raw.unlink(missing_ok=True)
    return n


def main() -> None:
    batch_size = int(sys.argv[1]) if len(sys.argv) > 1 else 15
    all_jobs = jobs()
    stalls = 0
    while True:
        convert(all_jobs)
        todo = [e for e in all_jobs if not (OUT / e["f"]).exists()]
        print(time.strftime("%H:%M"), "remaining", len(todo), flush=True)
        if not todo:
            break
        batch = todo[:batch_size]
        (WORK / "batch.json").write_text(json.dumps([{"file": "raw/" + pathlib.Path(e["f"]).stem + ".png", "prompt": e["prompt"]} for e in batch],
                                                    ensure_ascii=False, indent=1), encoding="utf8")
        instruction = ("Read batch.json in the current directory. For EVERY entry, use your built-in image generation tool to create one image "
                       "from its 'prompt', then copy the generated image file to the path in 'file' (relative to the current directory, PNG). "
                       "Do them one by one. Do not modify any other files. When finished, reply with the number of images saved.")
        try:
            r = subprocess.run([CODEX, "exec", "--skip-git-repo-check", "-s", "workspace-write", "-C", str(WORK), instruction],
                               stdin=subprocess.DEVNULL, capture_output=True, text=True, encoding="utf8", errors="replace", timeout=3600)
            print("codex exit", r.returncode, (r.stdout or "")[-200:].replace("\n", " "), flush=True)
        except subprocess.TimeoutExpired:
            print("codex timeout", flush=True)
        made = convert(all_jobs)
        print("converted", made, flush=True)
        stalls = stalls + 1 if made == 0 else 0
        if stalls >= 2:
            print("no progress twice, stopping", flush=True)
            break
    print("DONE", flush=True)


if __name__ == "__main__":
    main()
