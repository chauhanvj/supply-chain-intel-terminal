from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import json
from app.database import get_db

router = APIRouter(prefix="/api/indian-stocks", tags=["Indian Stocks Impact"])

@router.get("")
def list_indian_stocks(
    market_cap_tier: Optional[str] = None,
    impact_direction: Optional[str] = None,
    impact_nature: Optional[str] = None,
    sector: Optional[str] = None,
    material: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "market_cap_desc"
):
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM indian_stocks_impact WHERE 1=1"
    params = []

    if market_cap_tier and market_cap_tier != "All":
        if market_cap_tier == "Micro/Nano Cap":
            query += " AND market_cap_tier IN ('Micro Cap', 'Nano Cap')"
        else:
            query += " AND market_cap_tier = ?"
            params.append(market_cap_tier)

    if impact_direction and impact_direction != "All":
        query += " AND impact_direction = ?"
        params.append(impact_direction.upper())

    if impact_nature and impact_nature != "All":
        query += " AND impact_nature = ?"
        params.append(impact_nature.upper())

    if sector and sector != "All":
        query += " AND (sector LIKE ? OR industry LIKE ?)"
        params.extend([f"%{sector}%", f"%{sector}%"])

    if material and material != "All":
        query += " AND primary_materials_exposed LIKE ?"
        params.append(f"%{material}%")

    if search:
        s = f"%{search}%"
        query += """ AND (
            ticker LIKE ? OR company_name LIKE ? OR sector LIKE ? OR industry LIKE ?
            OR transmission_mechanism LIKE ? OR primary_materials_exposed LIKE ?
            OR key_products_at_risk LIKE ?
        )"""
        params.extend([s, s, s, s, s, s, s])

    # Sorting
    if sort_by == "market_cap_desc":
        query += " ORDER BY market_cap_inr_cr DESC"
    elif sort_by == "market_cap_asc":
        query += " ORDER BY market_cap_inr_cr ASC"
    elif sort_by == "margin_risk_desc":
        query += " ORDER BY ebitda_margin_risk_pct ASC" # Most negative first
    elif sort_by == "margin_risk_asc":
        query += " ORDER BY ebitda_margin_risk_pct DESC" # Most positive first
    else:
        query += " ORDER BY market_cap_inr_cr DESC"

    rows = cursor.execute(query, params).fetchall()

    # Aggregate statistics
    all_rows = cursor.execute("SELECT * FROM indian_stocks_impact").fetchall()
    total_count = len(all_rows)
    direct_count = sum(1 for r in all_rows if r["impact_nature"] == "DIRECT")
    negative_count = sum(1 for r in all_rows if r["impact_direction"] == "NEGATIVE")
    positive_count = sum(1 for r in all_rows if r["impact_direction"] == "POSITIVE")

    tier_counts = {
        "Large Cap": sum(1 for r in all_rows if r["market_cap_tier"] == "Large Cap"),
        "Mid Cap": sum(1 for r in all_rows if r["market_cap_tier"] == "Mid Cap"),
        "Small Cap": sum(1 for r in all_rows if r["market_cap_tier"] == "Small Cap"),
        "Micro Cap": sum(1 for r in all_rows if r["market_cap_tier"] == "Micro Cap"),
        "Nano Cap": sum(1 for r in all_rows if r["market_cap_tier"] == "Nano Cap")
    }

    items = []
    for r in rows:
        d = dict(r)
        d["primary_materials_exposed"] = json.loads(d["primary_materials_exposed"]) if d["primary_materials_exposed"] else []
        d["disruption_event_ids"] = json.loads(d["disruption_event_ids"]) if d["disruption_event_ids"] else []
        d["key_products_at_risk"] = json.loads(d["key_products_at_risk"]) if d["key_products_at_risk"] else []
        items.append(d)

    conn.close()

    return {
        "total": len(items),
        "statistics": {
            "total_tracked": total_count,
            "direct_impact_count": direct_count,
            "negative_impact_count": negative_count,
            "positive_impact_count": positive_count,
            "tier_counts": tier_counts
        },
        "stocks": items
    }

@router.get("/{identifier}")
def get_indian_stock_detail(identifier: str):
    conn = get_db()
    cursor = conn.cursor()

    row = cursor.execute("""
    SELECT * FROM indian_stocks_impact
    WHERE id = ? OR ticker = ? OR company_name LIKE ?
    """, (identifier, identifier.upper(), f"%{identifier}%")).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Indian stock profile not found")

    stock = dict(row)
    stock["primary_materials_exposed"] = json.loads(stock["primary_materials_exposed"]) if stock["primary_materials_exposed"] else []
    stock["disruption_event_ids"] = json.loads(stock["disruption_event_ids"]) if stock["disruption_event_ids"] else []
    stock["key_products_at_risk"] = json.loads(stock["key_products_at_risk"]) if stock["key_products_at_risk"] else []

    # Correlate linked global events
    linked_events = []
    for ev_id in stock["disruption_event_ids"]:
        ev_row = cursor.execute("SELECT id, title, severity, status, price_impact, lead_time_impact, start_date FROM events WHERE id = ?", (ev_id,)).fetchone()
        if ev_row:
            linked_events.append(dict(ev_row))

    stock["linked_events"] = linked_events
    conn.close()

    return stock
