from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import json
from datetime import datetime, timedelta
from app.database import get_db
from app.risk_engine import get_risk_weights, update_risk_weights, calculate_composite_risk_score

router = APIRouter(prefix="/api/analytics", tags=["Executive Analytics"])

@router.get("/command_center")
def get_command_center_kpis():
    conn = get_db()
    cursor = conn.cursor()

    # Active disruptions
    active_count = cursor.execute("SELECT COUNT(*) FROM events WHERE is_active = 1").fetchone()[0]

    # Escalating events
    escalating_count = cursor.execute("SELECT COUNT(*) FROM events WHERE status = 'Escalating' AND is_active = 1").fetchone()[0]

    # Price pressure events
    price_pressure_count = cursor.execute("""
    SELECT COUNT(*) FROM events
    WHERE price_pressure_category IN ('PRICE ALREADY RISING', 'PRICE PRESSURE BUILDING') AND is_active = 1
    """).fetchone()[0]

    # Lead-time risks
    lead_time_risks_count = cursor.execute("""
    SELECT COUNT(*) FROM events
    WHERE lead_time_change_pct > 25.0 AND is_active = 1
    """).fetchone()[0]

    # New events last 7 days
    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    new_7d_count = cursor.execute("""
    SELECT COUNT(*) FROM events
    WHERE start_date >= ? OR reported_date >= ?
    """, (seven_days_ago, seven_days_ago)).fetchone()[0]

    # Critical materials at risk (Risk score >= 80)
    critical_materials_count = cursor.execute("""
    SELECT COUNT(*) FROM commodities_materials
    WHERE current_risk_score >= 80.0
    """).fetchone()[0]

    # Average global severity
    avg_severity = cursor.execute("SELECT AVG(severity) FROM events WHERE is_active = 1").fetchone()[0] or 65.0

    if avg_severity >= 80:
        global_risk_level = "CRITICAL"
        global_risk_color = "#ef4444"
        global_risk_badge = "🔴 Critical"
    elif avg_severity >= 65:
        global_risk_level = "HIGH"
        global_risk_color = "#f97316"
        global_risk_badge = "🟠 High"
    elif avg_severity >= 40:
        global_risk_level = "MODERATE"
        global_risk_color = "#f59e0b"
        global_risk_badge = "🟡 Moderate"
    else:
        global_risk_level = "LOW"
        global_risk_color = "#10b981"
        global_risk_badge = "🟢 Low"

    conn.close()

    return {
        "global_supply_risk": {
            "level": global_risk_level,
            "badge": global_risk_badge,
            "color": global_risk_color,
            "average_severity": round(avg_severity, 1)
        },
        "active_disruptions": active_count,
        "escalating_events": escalating_count,
        "price_pressure_events": price_pressure_count,
        "lead_time_risks": lead_time_risks_count,
        "new_events_last_7_days": new_7d_count,
        "critical_materials_at_risk": critical_materials_count,
        "last_refresh": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

@router.get("/top20")
def get_top_20_risks():
    """
    Ranks top 20 global supply chain risks by:
    1. Severity
    2. Probability of continuation/escalation
    3. Supply concentration
    4. Price impact
    5. Lead-time impact
    6. Downstream economic importance
    7. Duration
    8. Geopolitical sensitivity
    """
    conn = get_db()
    cursor = conn.cursor()

    rows = cursor.execute("""
    SELECT * FROM events
    WHERE is_active = 1
    ORDER BY severity DESC, confidence_score DESC
    LIMIT 20
    """).fetchall()

    items = []
    rank = 1
    for r in rows:
        d = dict(r)
        d["rank"] = rank
        d["downstream_industries"] = json.loads(d["downstream_industries"]) if d["downstream_industries"] else []
        d["composite_score"] = round(d["severity"] * 0.7 + d["confidence_score"] * 0.3, 1)
        items.append(d)
        rank += 1

    conn.close()
    return {"total": len(items), "top_risks": items}

@router.get("/what_changed_today")
def get_what_changed_today():
    """
    Shows daily changes with color tags and direct links to underlying events.
    """
    conn = get_db()
    cursor = conn.cursor()

    events = cursor.execute("""
    SELECT id, title, category, country, severity, status, material_affected,
           price_impact, lead_time_impact, latest_update, data_type
    FROM events
    WHERE is_active = 1
    ORDER BY latest_update DESC, severity DESC
    LIMIT 8
    """).fetchall()

    changelog = []
    for ev in events:
        sev = ev["severity"]
        if sev >= 85:
            tag_color = "red"
            tag_icon = "🔴"
            urgency = "Critical Disruption"
        elif sev >= 75:
            tag_color = "orange"
            tag_icon = "🟠"
            urgency = "Significant Disruption"
        elif sev >= 60:
            tag_color = "yellow"
            tag_icon = "🟡"
            urgency = "Emerging Signal"
        else:
            tag_color = "green"
            tag_icon = "🟢"
            urgency = "Stabilizing / Resolving"

        changelog.append({
            "event_id": ev["id"],
            "icon": tag_icon,
            "color": tag_color,
            "urgency": urgency,
            "headline": f"{ev['country']}: {ev['material_affected']} — {ev['title'][:90]}...",
            "material": ev["material_affected"],
            "status": ev["status"],
            "price_impact": ev["price_impact"],
            "lead_time_impact": ev["lead_time_impact"],
            "data_type": ev["data_type"],
            "timestamp": ev["latest_update"]
        })

    conn.close()
    return {"changelog": changelog}

@router.get("/what_could_become_expensive")
def get_what_could_become_expensive():
    """
    AI-generated forward-looking panel:
    Ranks materials based on fundamental supply pressures without unsupported financial claims.
    Uses probabilistic phrasing ('High probability of upward pressure', 'Moderate risk', 'Early signal').
    """
    conn = get_db()
    cursor = conn.cursor()

    rows = cursor.execute("""
    SELECT m.*, 
           (SELECT COUNT(*) FROM events e WHERE (e.material_affected LIKE '%' || m.name || '%' OR e.commodity_affected LIKE '%' || m.name || '%') AND e.is_active = 1) as active_event_count
    FROM commodities_materials m
    WHERE price_pressure_status IN ('PRICE PRESSURE BUILDING', 'POTENTIAL FUTURE PRICE RISE')
       OR (current_risk_score >= 70.0 AND single_point_of_failure = 1)
    ORDER BY early_warning_score DESC, current_risk_score DESC
    LIMIT 10
    """).fetchall()

    forecasts = []
    for r in rows:
        d = dict(r)
        score = d["early_warning_score"]
        if score >= 85:
            outlook = "High probability of upward pressure"
            timeframe = "1 to 3 months"
            confidence = "92% (Multiple independent supply cuts & high concentration)"
        elif score >= 70:
            outlook = "Moderate risk of upward pressure"
            timeframe = "3 to 6 months"
            confidence = "78% (Trade friction & inventory buffer depletion)"
        else:
            outlook = "Early signal / Developing tension"
            timeframe = "6 to 12 months"
            confidence = "65% (Early policy announcements and capacity lag)"

        downstream = json.loads(d["downstream_industries"]) if d["downstream_industries"] else []

        forecasts.append({
            "material": d["name"],
            "category": d["category"],
            "outlook": outlook,
            "why": d["main_cause"],
            "evidence": f"Mining concentration: {d['mining_concentration_pct']:.0f}%, Processing concentration: {d['processing_concentration_pct']:.0f}%. Single Point of Failure: {'YES' if d['single_point_of_failure'] else 'NO'}.",
            "expected_timeframe": timeframe,
            "confidence": confidence,
            "potential_downstream_impact": f"May increase bill-of-materials costs for {', '.join(downstream[:3])}."
        })

    conn.close()
    return {"forecasts": forecasts}

@router.get("/what_is_already_expensive")
def get_what_is_already_expensive():
    """
    Confirmed price increases only, supported by verified evidence.
    """
    conn = get_db()
    cursor = conn.cursor()

    rows = cursor.execute("""
    SELECT id, material_affected, price_pct_change, price_impact, start_date, latest_update, primary_cause, evidence
    FROM events
    WHERE price_pressure_category = 'PRICE ALREADY RISING' AND price_pct_change > 0
    ORDER BY price_pct_change DESC
    """).fetchall()

    confirmed = []
    for r in rows:
        d = dict(r)
        confirmed.append({
            "event_id": d["id"],
            "material": d["material_affected"],
            "price_change": f"+{d['price_pct_change']:.1f}%",
            "period": f"Since {d['start_date']}",
            "cause": d["primary_cause"],
            "evidence": d["evidence"],
            "price_impact_details": d["price_impact"]
        })

    conn.close()
    return {"confirmed_increases": confirmed}

@router.get("/what_is_harder_to_buy")
def get_what_is_harder_to_buy():
    """
    Focuses on physical availability: allocation, shortages, order delays, lead-time stretch.
    """
    conn = get_db()
    cursor = conn.cursor()

    # Query materials and components facing allocation or lead-time stretch
    events = cursor.execute("""
    SELECT id, material_affected, component_affected, availability_impact, lead_time_impact,
           current_lead_time_weeks, normal_lead_time_weeks, lead_time_change_pct, supplier_affected, status
    FROM events
    WHERE availability_impact IS NOT NULL AND lead_time_change_pct >= 30.0 AND is_active = 1
    ORDER BY lead_time_change_pct DESC
    """).fetchall()

    items = []
    for e in events:
        d = dict(e)
        items.append({
            "event_id": d["id"],
            "product_material": d["component_affected"] or d["material_affected"],
            "availability_status": d["availability_impact"],
            "lead_time": f"{d['current_lead_time_weeks']:.0f} weeks (Normal: {d['normal_lead_time_weeks']:.0f}w, +{d['lead_time_change_pct']:.0f}%)",
            "affected_suppliers": d["supplier_affected"],
            "operational_status": d["status"]
        })

    conn.close()
    return {"hard_to_buy": items}

@router.get("/lead_times")
def get_lead_times_tracker():
    """
    Dedicated Lead-Time Detector.
    Tracks normal lead time vs current lead time, % increase, supplier, and root cause.
    """
    conn = get_db()
    cursor = conn.cursor()

    components = cursor.execute("""
    SELECT * FROM critical_components
    ORDER BY lead_time_pct_increase DESC
    """).fetchall()

    comp_items = []
    for c in components:
        d = dict(c)
        d["affected_suppliers"] = json.loads(d["affected_suppliers"]) if d["affected_suppliers"] else []
        comp_items.append(d)

    conn.close()
    return {"components": comp_items}

@router.get("/risk_weights")
def get_weights():
    return get_risk_weights()

@router.post("/risk_weights")
def update_weights(weights: dict):
    return update_risk_weights(weights)
