# 바로담 마켓 빌드: src.html + catalog.json + extras.json + img/gen/*.jpg -> index.html
# 사진이 실제로 있는 상품만 넣는다 (사진 1장 = 상품 1개, 같은 사진을 두 상품에 쓰지 않음)
import json, re, pathlib, hashlib
root = pathlib.Path(__file__).parent
gen = root / "img" / "gen"
src = (root / "src.html").read_text(encoding="utf8")
catalog = json.loads((root / "catalog.json").read_text(encoding="utf8"))
extras = json.loads((root / "extras.json").read_text(encoding="utf8"))

seen = {}
items = []
ccset = set(json.loads((root / "cc_assigned.json").read_text(encoding="utf8"))) if (root / "cc_assigned.json").exists() else set()
for e in catalog:
    p = gen / e["f"]
    if not p.exists() or e["f"] in ccset:  # this product already uses a CC0 photo
        continue
    h = hashlib.md5(p.read_bytes()).hexdigest()
    if h in seen:  # identical file used twice -> skip
        print("duplicate photo skipped:", e["f"], "=", seen[h]); continue
    seen[h] = e["f"]
    items.append({"f": "gen/" + e["f"], "type": e["type"], "name": e["name"], "brand": e["brand"], "color": e["color"]})
from PIL import Image
def dh(path):
    px=list(Image.open(path).convert("L").resize((9,8)).getdata())
    return sum(1<<i for i in range(64) if px[(i//8)*9+i%8]>px[(i//8)*9+i%8+1])
hs=[dh(gen/e["f"][4:]) for e in items]
cc=json.loads((root/"cc_items.json").read_text(encoding="utf8")) if (root/"cc_items.json").exists() else []
credits=[]
for e in cc:
    p=root/"img"/e["f"]
    if not p.exists(): continue
    h=hashlib.md5(p.read_bytes()).hexdigest(); d=dh(p)
    if h in seen or any(bin(d^x).count("1")<=6 for x in hs):
        print("duplicate photo skipped:", e["f"]); continue
    seen[h]=e["f"]; hs.append(d)
    items.append({k:e[k] for k in ("f","type","name","brand","color")})
    credits.append((e["f"],e["title"],e["by"],e["src"]))
lines=["# 사진 출처","","- `img/gen/`: Codex(OpenAI) 이미지 생성으로 만든 사진","- `img/cc/`: Openverse에서 찾은 CC0(퍼블릭 도메인) 사진. 사진 속 상품명·브랜드와 사이트의 상품 정보는 관계없어요.",""]
lines+=[f"- `{f}` {t or '(제목 없음)'}{' / '+b if b else ''} — {u}" for f,t,b,u in credits]
(root/"CREDITS.md").write_text("\n".join(lines)+"\n",encoding="utf8")
reserved = {x["key"]: "gen/" + x["f"] for x in extras if (gen / x["f"]).exists()}
photos = {"items": items, "reserved": reserved}

body = re.sub(r"/\*PHOTOS\*/.*?/\*END\*/", lambda m: "/*PHOTOS*/" + json.dumps(photos, ensure_ascii=False) + "/*END*/", src, flags=re.S)
title = re.search(r"<title>.*?</title>", body).group(0)
body = body.replace(title, "", 1)
og = "https://barodam.kro.kr/img/" + reserved.get("hero0", "gen/hero0.jpg")
head = f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{title}
<meta name="description" content="바로담 마켓 - 오늘만 특가, 실시간 랭킹, 내일 도착까지. 패션·디지털·리빙·식품을 한곳에서.">
<meta property="og:title" content="바로담 마켓">
<meta property="og:description" content="오늘만 특가, 실시간 랭킹, 판매처별 가격 비교까지">
<meta property="og:image" content="{og}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#E8461E">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23E8461E'/%3E%3Ctext x='32' y='45' font-size='36' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='900'%3E%EB%8B%B4%3C/text%3E%3C/svg%3E">
<style>html{{color-scheme:light}}:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0;font:14px system-ui,sans-serif}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
"""
out = head + "</head>\n<body>\n" + body + "\n</body>\n</html>\n"
(root / "index.html").write_text(out, encoding="utf8")
print("index.html", len(out), "bytes,", len(items), "products,", len(reserved), "banner/category photos")
