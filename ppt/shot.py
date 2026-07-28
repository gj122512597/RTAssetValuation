import time, os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5174"
OUT = "/Users/johnson/CodeBuddy/RTAssetValuation/ppt/shots"
os.makedirs(OUT, exist_ok=True)

def shot(pg, name):
    pg.screenshot(path=f"{OUT}/{name}.png")
    print("shot", name)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})

    # 1. Dashboard
    pg.goto(BASE + "/", wait_until="domcontentloaded"); time.sleep(5)
    shot(pg, "01_dashboard")

    # 2-4. 详情页（先等结论区渲染，确保 loadAll 完成）
    pg.goto(BASE + "/asset/RZ-2023-001", wait_until="domcontentloaded")
    pg.get_by_text("结论", exact=False).first.wait_for(timeout=40000)
    time.sleep(2)
    shot(pg, "02_detail_top")

    pg.get_by_text("竞品对标分析").scroll_into_view_if_needed(); time.sleep(1.5)
    shot(pg, "03_detail_comp")

    pg.get_by_text("AI 建模特征").scroll_into_view_if_needed(); time.sleep(1.5)
    shot(pg, "04_detail_aifeature")

    # 5. 新资产估价录入
    pg.goto(BASE + "/valuation/new", wait_until="domcontentloaded"); time.sleep(4)
    shot(pg, "05_new_valuation")

    # 6. 尽职调查中心
    pg.goto(BASE + "/due-diligence", wait_until="domcontentloaded"); time.sleep(4)
    shot(pg, "06_due_diligence")

    # 7. 建模介绍
    pg.goto(BASE + "/modeling-intro", wait_until="domcontentloaded"); time.sleep(4)
    shot(pg, "07_modeling")

    b.close()
print("ALL DONE")
