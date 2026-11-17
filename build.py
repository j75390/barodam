# 바로담 마켓 빌드: src.html + photos.json -> index.html (GitHub Pages 등 어디서나 열리는 완전한 HTML)
import json, re, pathlib
root = pathlib.Path(__file__).parent
src = (root / "src.html").read_text(encoding="utf8")
photos = json.loads((root / "photos.json").read_text(encoding="utf8"))
body = re.sub(r"/\*PHOTOS\*/.*?/\*END\*/", "/*PHOTOS*/" + json.dumps(photos, ensure_ascii=False) + "/*END*/", src, flags=re.S)
title = re.search(r"<title>.*?</title>", body).group(0)
body = body.replace(title, "", 1)
head = f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{title}
<meta name="description" content="바로담 마켓 - 더미 데이터로 만든 쇼핑몰 시제품. 실제 판매는 하지 않아요.">
<meta property="og:title" content="바로담 마켓">
<meta property="og:description" content="오늘만 특가, 실시간 랭킹, 가격 비교까지 담은 쇼핑몰 시제품">
<meta property="og:image" content="https://barodam.kro.kr/img/coat1.jpg">
<meta property="og:type" content="website">
<meta name="theme-color" content="#E8461E">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23E8461E'/%3E%3Ctext x='32' y='45' font-size='36' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='900'%3E%EB%8B%B4%3C/text%3E%3C/svg%3E">
<style>html{{color-scheme:light}}:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0;font:14px system-ui,sans-serif}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
"""
out = head + "</head>\n<body>\n" + body + "\n</body>\n</html>\n"
(root / "index.html").write_text(out, encoding="utf8")
print("index.html", len(out), "bytes,", sum(len(v) for v in photos.values()), "photos")
