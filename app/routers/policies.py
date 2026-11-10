from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import json
from app.database import get_db

router = APIRouter(prefix="/api/policies", tags=["Policy Tracker"])

@router.get("")
def list_policies(
    policy_type: Optional[str] = None,
    country: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM policies WHERE 1=1"
    params = []

    if policy_type and policy_type != "All":
        query += " AND policy_type LIKE ?"
        params.append(f"%{policy_type}%")

    if country and country != "All":
        query += " AND country LIKE ?"
        params.append(f"%{country}%")

    if status and status != "All":
        query += " AND status = ?"
        params.append(status)

    if search:
        s = f"%{search}%"
        query += " AND (policy_name LIKE ? OR supply_impact LIKE ? OR price_impact LIKE ? OR affected_materials LIKE ?)"
        params.extend([s, s, s, s])

    query += " ORDER BY effective_date DESC"

    rows = cursor.execute(query, params).fetchall()
    items = []
    for r in rows:
        d = dict(r)
        d["affected_materials"] = json.loads(d["affected_materials"]) if d["affected_materials"] else []
        d["affected_countries"] = json.loads(d["affected_countries"]) if d["affected_countries"] else []
        d["affected_suppliers"] = json.loads(d["affected_suppliers"]) if d["affected_suppliers"] else []
        items.append(d)

    conn.close()
    return {"total": len(items), "policies": items}
