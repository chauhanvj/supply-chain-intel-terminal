from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
import json
from app.database import get_db

router = APIRouter(prefix="/api/events", tags=["Events"])

@router.get("")
def list_events(
    category: Optional[str] = None,
    country: Optional[str] = None,
    material: Optional[str] = None,
    status: Optional[str] = None,
    data_type: Optional[str] = None,
    min_severity: Optional[float] = None,
    price_pressure: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "severity_desc"
):
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM events WHERE is_active = 1"
    params = []

    if category and category != "All":
        query += " AND category = ?"
        params.append(category)

    if country and country != "All":
        query += " AND country LIKE ?"
        params.append(f"%{country}%")

    if material and material != "All":
        query += " AND (material_affected LIKE ? OR commodity_affected LIKE ?)"
        params.append(f"%{material}%")
        params.append(f"%{material}%")

    if status and status != "All":
        query += " AND status = ?"
        params.append(status)

    if data_type and data_type != "All":
        query += " AND data_type = ?"
        params.append(data_type)

    if min_severity is not None:
        query += " AND severity >= ?"
        params.append(min_severity)

    if price_pressure and price_pressure != "All":
        query += " AND price_pressure_category = ?"
        params.append(price_pressure)

    if search:
        search_term = f"%{search}%"
        query += """ AND (
            title LIKE ? OR primary_cause LIKE ? OR material_affected LIKE ?
            OR country LIKE ? OR summary_executive LIKE ? OR downstream_industries LIKE ?
        )"""
        params.extend([search_term, search_term, search_term, search_term, search_term, search_term])

    # Sorting
    if sort_by == "severity_desc":
        query += " ORDER BY severity DESC"
    elif sort_by == "severity_asc":
        query += " ORDER BY severity ASC"
    elif sort_by == "date_desc":
        query += " ORDER BY start_date DESC"
    elif sort_by == "date_asc":
        query += " ORDER BY start_date ASC"
    elif sort_by == "confidence_desc":
        query += " ORDER BY confidence_score DESC"
    else:
        query += " ORDER BY severity DESC"

    rows = cursor.execute(query, params).fetchall()
    events = []
    for r in rows:
        d = dict(r)
        d["downstream_industries"] = json.loads(d["downstream_industries"]) if d["downstream_industries"] else []
        d["secondary_causes"] = json.loads(d["secondary_causes"]) if d["secondary_causes"] else []
        events.append(d)

    conn.close()
    return {"total": len(events), "events": events}

@router.get("/{event_id}")
def get_event_detail(event_id: str):
    conn = get_db()
    cursor = conn.cursor()

    row = cursor.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Event not found")

    event = dict(row)
    event["downstream_industries"] = json.loads(event["downstream_industries"]) if event["downstream_industries"] else []
    event["secondary_causes"] = json.loads(event["secondary_causes"]) if event["secondary_causes"] else []

    # Sources
    sources = cursor.execute("SELECT * FROM event_sources WHERE event_id = ? ORDER BY reliability_score DESC", (event_id,)).fetchall()
    event["sources"] = [dict(s) for s in sources]

    # Timeline
    timeline = cursor.execute("SELECT * FROM event_timeline WHERE event_id = ? ORDER BY milestone_date ASC, order_idx ASC", (event_id,)).fetchall()
    event["timeline"] = [dict(t) for t in timeline]

    # Causal chain
    causal = cursor.execute("SELECT * FROM causal_links WHERE event_id = ? ORDER BY step_order ASC", (event_id,)).fetchall()
    event["causal_links"] = [dict(c) for c in causal]

    conn.close()
    return event
