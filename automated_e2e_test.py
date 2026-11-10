import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\admin\.gemini\antigravity\brain\bf12d9b0-5285-4029-8030-624d34341096"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def run_e2e():
    print("Starting automated browser E2E test...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 1000})
        page = context.new_page()

        # Capture console errors if any
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # 1. Load Command Center
        print("1. Loading http://127.0.0.1:8000/...")
        page.goto("http://127.0.0.1:8000/", wait_until="networkidle")
        time.sleep(2)

        # Check KPIs
        active_disruptions = page.inner_text("#kpi-active-disruptions")
        print(f"Active Disruptions KPI: {active_disruptions}")
        assert int(active_disruptions) > 0, "Active disruptions KPI should be > 0"

        # Take Command Center screenshot
        cc_shot = os.path.join(ARTIFACT_DIR, "command_center.png")
        page.screenshot(path=cc_shot, full_page=False)
        print(f"Command Center screenshot saved: {cc_shot}")

        # 2. Test opening Event Detail Modal for the Canonical Sulfur -> H-Acid event
        print("2. Opening Canonical Sulfur -> H-Acid Event...")
        page.evaluate("openEventDetail('EVT-2025-SULF-01')")
        time.sleep(1.5)

        modal_title = page.inner_text("#event-modal-content h2")
        print(f"Event Modal Title: {modal_title[:60]}...")
        assert "Sulfur" in modal_title or "H-Acid" in modal_title

        # Check causal chain nodes
        causal_text = page.inner_text("#modal-causal-container")
        assert "VERIFIED CAUSATION" in causal_text, "Should contain verified causation tags"
        assert "AI-INFERRED" in causal_text, "Should contain AI-inferred relationship tags"
        print("Verified and Inferred causal nodes verified successfully.")

        # Screenshot Event Modal
        modal_shot = os.path.join(ARTIFACT_DIR, "event_causal_detail.png")
        page.screenshot(path=modal_shot, full_page=False)
        print(f"Event detail screenshot saved: {modal_shot}")

        # Close modal
        page.click("#event-detail-modal button:has(.fa-xmark)")
        time.sleep(0.5)

        # 3. Test Global Map View
        print("3. Switching to Global Map View...")
        page.click("[data-view-target='global-map']")
        time.sleep(2)
        map_shot = os.path.join(ARTIFACT_DIR, "global_map.png")
        page.screenshot(path=map_shot, full_page=False)
        print(f"Global Map screenshot saved: {map_shot}")

        # 4. Test Commodities View
        print("4. Switching to Commodities Watchlist...")
        page.click("[data-view-target='commodities']")
        time.sleep(1)
        commodities_shot = os.path.join(ARTIFACT_DIR, "commodities_watchlist.png")
        page.screenshot(path=commodities_shot, full_page=False)
        print(f"Commodities screenshot saved: {commodities_shot}")

        # 5. Test Critical Materials (SPOF) View
        print("5. Switching to Critical Materials SPOF...")
        page.click("[data-view-target='critical-materials']")
        time.sleep(1)

        # 6. Test Policy Tracker View
        print("6. Switching to Policy Tracker...")
        page.click("[data-view-target='policy-tracker']")
        time.sleep(1)

        # 7. Test Lead Times Detector View
        print("7. Switching to Lead Times Detector...")
        page.click("[data-view-target='lead-times']")
        time.sleep(1)

        # 8. Test Data Sources View
        print("8. Switching to Data Sources & API Config...")
        page.click("[data-view-target='data-sources']")
        time.sleep(1)
        sources_shot = os.path.join(ARTIFACT_DIR, "data_sources.png")
        page.screenshot(path=sources_shot, full_page=False)
        print(f"Data Sources screenshot saved: {sources_shot}")

        # 9. Test Transparent Risk Weights Modal
        print("9. Testing Transparent Risk Weights Modal...")
        page.evaluate("openRiskWeightsModal()")
        time.sleep(0.8)
        weights_text = page.inner_text("#risk-weights-modal")
        assert "Supply Concentration" in weights_text
        page.click("#risk-weights-modal button:has(.fa-xmark)")

        print("\nSUCCESS: All automated browser tests passed!")
        if console_errors:
            print("Console errors caught (if non-critical font/cdn):", console_errors)

        browser.close()

if __name__ == "__main__":
    run_e2e()
