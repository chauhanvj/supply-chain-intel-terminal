from fastapi import APIRouter, HTTPException, Query
import json
from app.database import get_db

router = APIRouter(prefix="/api/industries", tags=["Industry View"])

@router.get("")
def list_industries():
    conn = get_db()
    cursor = conn.cursor()

    rows = cursor.execute("SELECT * FROM industries ORDER BY overall_risk_score DESC").fetchall()
    items = []
    for r in rows:
        d = dict(r)
        d["value_chain_nodes"] = json.loads(d["value_chain_nodes"]) if d["value_chain_nodes"] else []
        d["critical_dependencies"] = json.loads(d["critical_dependencies"]) if d["critical_dependencies"] else []
        items.append(d)

    conn.close()
    return {"total": len(items), "industries": items}

@router.get("/{ind_id}")
def get_industry_detail(ind_id: str):
    conn = get_db()
    cursor = conn.cursor()

    row = cursor.execute("SELECT * FROM industries WHERE id = ? OR code = ?", (ind_id, ind_id)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Industry not found")

    d = dict(row)
    d["value_chain_nodes"] = json.loads(d["value_chain_nodes"]) if d["value_chain_nodes"] else []
    d["critical_dependencies"] = json.loads(d["critical_dependencies"]) if d["critical_dependencies"] else []

    # Get active events affecting this industry
    name = d["name"]
    events = cursor.execute("""
    SELECT id, title, severity, status, material_affected, price_impact, lead_time_impact
    FROM events
    WHERE downstream_industries LIKE ? AND is_active = 1
    ORDER BY severity DESC
    """, (f"%{name}%",)).fetchall()
    d["disruptions"] = [dict(e) for e in events]

    conn.close()
    return d
