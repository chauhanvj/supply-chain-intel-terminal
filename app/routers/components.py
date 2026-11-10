from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import json
from app.database import get_db

router = APIRouter(prefix="/api/components", tags=["Critical Components"])

@router.get("")
def list_components(
    sector: Optional[str] = None,
    risk_level: Optional[str] = None,
    search: Optional[str] = None
):
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM critical_components WHERE 1=1"
    params = []

    if sector and sector != "All":
        query += " AND sector LIKE ?"
        params.append(f"%{sector}%")

    if risk_level and risk_level != "All":
        query += " AND risk_level = ?"
        params.append(risk_level)

    if search:
        s = f"%{search}%"
        query += " AND (name LIKE ? OR bottleneck_reason LIKE ? OR downstream_impact LIKE ? OR sector LIKE ? OR key_precursors LIKE ?)"
        params.extend([s, s, s, s, s])

    query += " ORDER BY risk_score DESC"

    rows = cursor.execute(query, params).fetchall()
    items = []
    for r in rows:
        d = dict(r)
        d["affected_suppliers"] = json.loads(d["affected_suppliers"]) if d["affected_suppliers"] else []
        d["key_precursors"] = json.loads(d["key_precursors"]) if d["key_precursors"] else []
        items.append(d)

    conn.close()
    return {"total": len(items), "components": items}
