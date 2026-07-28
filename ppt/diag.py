from playwright.sync_api import sync_playwright
import time
BASE = "http://localhost:5174"
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(BASE + "/asset/RZ-2023-001", wait_until="domcontentloaded")
    time.sleep(9)
    txt = pg.evaluate("document.body.innerText")
    print("BODY_LEN", len(txt))
    print("=== HEAD ===")
    print(txt[:600])
    print("=== KEYWORDS ===")
    for k in ["结论", "404", "加载", "失败", "竞品对标", "AI 建模特征", "东直门", "资产画像"]:
        print(k, "->", k in txt)
    b.close()
