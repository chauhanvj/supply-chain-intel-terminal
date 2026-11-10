from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import json
from datetime import datetime
from app.database import get_db

router = APIRouter(prefix="/api/commodities", tags=["Commodities & Materials"])

@router.get("")
def list_commodities(
    category: Optional[str] = None,
    risk_level: Optional[str] = None,
    spof_only: bool = False,
    search: Optional[str] = None
):
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM commodities_materials WHERE 1=1"
    params = []

    if category and category != "All":
        query += " AND category = ?"
        params.append(category)

    if risk_level and risk_level != "All":
        query += " AND supply_risk_level = ?"
        params.append(risk_level)

    if spof_only:
        query += " AND single_point_of_failure = 1"

    if search:
        s = f"%{search}%"
        query += " AND (name LIKE ? OR category LIKE ? OR main_cause LIKE ? OR downstream_industries LIKE ?)"
        params.extend([s, s, s, s])

    query += " ORDER BY current_risk_score DESC"

    rows = cursor.execute(query, params).fetchall()
    items = []
    for r in rows:
        d = dict(r)
        d["top_producing_countries"] = json.loads(d["top_producing_countries"]) if d["top_producing_countries"] else []
        d["top_processing_countries"] = json.loads(d["top_processing_countries"]) if d["top_processing_countries"] else []
        d["alternative_suppliers"] = json.loads(d["alternative_suppliers"]) if d["alternative_suppliers"] else []
        d["alternative_countries"] = json.loads(d["alternative_countries"]) if d["alternative_countries"] else []
        d["downstream_industries"] = json.loads(d["downstream_industries"]) if d["downstream_industries"] else []
        d["key_downstream_components"] = json.loads(d["key_downstream_components"]) if d["key_downstream_components"] else []
        items.append(d)

    conn.close()
    return {"total": len(items), "commodities": items}

@router.get("/{mat_id}")
def get_commodity_detail(mat_id: str):
    conn = get_db()
    cursor = conn.cursor()

    row = cursor.execute("SELECT * FROM commodities_materials WHERE id = ? OR name LIKE ?", (mat_id, f"%{mat_id}%")).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Material not found")

    d = dict(row)
    d["top_producing_countries"] = json.loads(d["top_producing_countries"]) if d["top_producing_countries"] else []
    d["top_processing_countries"] = json.loads(d["top_processing_countries"]) if d["top_processing_countries"] else []
    d["alternative_suppliers"] = json.loads(d["alternative_suppliers"]) if d["alternative_suppliers"] else []
    d["alternative_countries"] = json.loads(d["alternative_countries"]) if d["alternative_countries"] else []
    d["downstream_industries"] = json.loads(d["downstream_industries"]) if d["downstream_industries"] else []
    d["key_downstream_components"] = json.loads(d["key_downstream_components"]) if d["key_downstream_components"] else []

    # Find associated active events
    events = cursor.execute("""
    SELECT id, title, severity, status, price_impact, lead_time_impact, start_date
    FROM events
    WHERE material_affected LIKE ? OR commodity_affected LIKE ?
    ORDER BY severity DESC
    """, (f"%{d['name']}%", f"%{d['name']}%")).fetchall()
    d["active_events"] = [dict(e) for e in events]

    conn.close()
    return d

@router.post("")
def add_custom_material(payload: dict):
    """Allows dynamic addition of strategic materials."""
    conn = get_db()
    cursor = conn.cursor()

    mat_id = f"mat-{payload.get('name', 'custom').lower().replace(' ', '-')}"
    now_str = datetime.now().strftime("%Y-%m-%d")

    cursor.execute("""
    INSERT OR REPLACE INTO commodities_materials (
        id, name, category, current_risk_score, early_warning_score, price_pressure_status,
        supply_risk_level, lead_time_status, normal_lead_time_weeks, current_lead_time_weeks,
        lead_time_pct_change, main_cause, top_producing_countries, top_processing_countries,
        mining_concentration_pct, processing_concentration_pct, single_point_of_failure,
        spof_reason, substitute_available, switching_difficulty, qualification_time,
        alternative_suppliers, alternative_countries, downstream_industries,
        key_downstream_components, tracking_since, last_updated
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        mat_id, payload.get("name"), payload.get("category", "Strategic Material"),
        payload.get("current_risk_score", 65.0), payload.get("early_warning_score", 70.0),
        payload.get("price_pressure_status", "PRICE PRESSURE BUILDING"),
        payload.get("supply_risk_level", "Moderate"),
        payload.get("lead_time_status", "Normal"),
        payload.get("normal_lead_time_weeks", 6.0),
        payload.get("current_lead_time_weeks", 8.0),
        payload.get("lead_time_pct_change", 33.3),
        payload.get("main_cause", "User tracked critical input"),
        json.dumps(payload.get("top_producing_countries", [])),
        json.dumps(payload.get("top_processing_countries", [])),
        payload.get("mining_concentration_pct", 50.0),
        payload.get("processing_concentration_pct", 50.0),
        payload.get("single_point_of_failure", 0),
        payload.get("spof_reason", ""),
        payload.get("substitute_available", "Limited"),
        payload.get("switching_difficulty", "Medium"),
        payload.get("qualification_time", "6 months"),
        json.dumps(payload.get("alternative_suppliers", [])),
        json.dumps(payload.get("alternative_countries", [])),
        json.dumps(payload.get("downstream_industries", ["General Manufacturing"])),
        json.dumps(payload.get("key_downstream_components", [])),
        now_str, now_str
    ))

    conn.commit()
    conn.close()
    return {"status": "success", "id": mat_id}
