from fastapi import APIRouter, HTTPException
import json
from app.database import get_db

router = APIRouter(prefix="/api/map", tags=["Geospatial & Map"])

COUNTRY_COORDINATES = {
    "China": {"lat": 35.86, "lng": 104.19},
    "United States": {"lat": 37.09, "lng": -95.71},
    "Russia": {"lat": 61.52, "lng": 105.31},
    "Chile": {"lat": -35.67, "lng": -71.54},
    "Guinea": {"lat": 9.94, "lng": -9.69},
    "Taiwan": {"lat": 23.69, "lng": 120.96},
    "Netherlands": {"lat": 52.13, "lng": 5.29},
    "Yemen": {"lat": 15.55, "lng": 48.51},
    "Panama": {"lat": 8.53, "lng": -80.78},
    "DRC": {"lat": -4.03, "lng": 21.75},
    "India": {"lat": 20.59, "lng": 78.96},
    "Australia": {"lat": -25.27, "lng": 133.77},
    "South Korea": {"lat": 35.90, "lng": 127.76},
    "Japan": {"lat": 36.20, "lng": 138.25},
    "Germany": {"lat": 51.16, "lng": 10.45},
    "Indonesia": {"lat": -0.78, "lng": 113.92}
}

@router.get("/markers")
def get_map_markers():
    """Returns geospatial points for active disruptions color-coded by severity."""
    conn = get_db()
    cursor = conn.cursor()

    events = cursor.execute("""
    SELECT id, title, category, country, specific_location, severity, status,
           material_affected, price_impact, lead_time_impact, data_type
    FROM events
    WHERE is_active = 1
    """).fetchall()

    markers = []
    for ev in events:
        c = ev["country"]
        coords = COUNTRY_COORDINATES.get(c, {"lat": 20.0, "lng": 0.0})
        
        # Color based on severity
        sev = ev["severity"]
        if sev >= 88:
            color = "#991b1b" # Dark Red (Critical)
            status_text = "Critical"
        elif sev >= 78:
            color = "#ef4444" # Red (Severe)
            status_text = "Severe"
        elif sev >= 65:
            color = "#f97316" # Orange (Significant)
            status_text = "Significant"
        elif sev >= 45:
            color = "#f59e0b" # Yellow (Emerging)
            status_text = "Emerging"
        else:
            color = "#10b981" # Green (Resolved)
            status_text = "Resolved"

        markers.append({
            "event_id": ev["id"],
            "title": ev["title"],
            "country": c,
            "location": ev["specific_location"],
            "category": ev["category"],
            "severity": sev,
            "status": ev["status"],
            "status_text": status_text,
            "color": color,
            "lat": coords["lat"],
            "lng": coords["lng"],
            "material_affected": ev["material_affected"],
            "price_impact": ev["price_impact"],
            "lead_time_impact": ev["lead_time_impact"],
            "data_type": ev["data_type"]
        })

    conn.close()
    return {"markers": markers}

@router.get("/country/{country_name}")
def get_country_intelligence(country_name: str):
    """
    Detailed country inspection profile:
    - active disruptions
    - affected commodities
    - affected companies/facilities
    - policy changes
    - price impacts
    - supply-chain risks
    """
    conn = get_db()
    cursor = conn.cursor()

    events = cursor.execute("""
    SELECT * FROM events
    WHERE country LIKE ? AND is_active = 1
    ORDER BY severity DESC
    """, (f"%{country_name}%",)).fetchall()

    policies = cursor.execute("""
    SELECT * FROM policies
    WHERE country LIKE ?
    ORDER BY effective_date DESC
    """, (f"%{country_name}%",)).fetchall()

    commodities = cursor.execute("""
    SELECT name, category, current_risk_score, supply_risk_level, single_point_of_failure
    FROM commodities_materials
    WHERE top_producing_countries LIKE ? OR top_processing_countries LIKE ?
    ORDER BY current_risk_score DESC
    """, (f"%{country_name}%", f"%{country_name}%")).fetchall()

    conn.close()

    ev_list = []
    affected_materials = set()
    affected_facilities = set()
    price_impacts = []

    for e in events:
        d = dict(e)
        d["downstream_industries"] = json.loads(d["downstream_industries"]) if d["downstream_industries"] else []
        ev_list.append(d)
        if d["material_affected"]:
            affected_materials.add(d["material_affected"])
        if d["factory_affected"]:
            affected_facilities.add(d["factory_affected"])
        if d["price_impact"]:
            price_impacts.append(d["price_impact"])

    return {
        "country": country_name,
        "active_disruptions_count": len(ev_list),
        "active_disruptions": ev_list,
        "affected_commodities": list(affected_materials),
        "affected_facilities": list(affected_facilities),
        "policy_changes": [dict(p) for p in policies],
        "price_impacts": price_impacts,
        "produced_commodities": [dict(c) for c in commodities]
    }
