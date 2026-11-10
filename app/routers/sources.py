from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.ingestion import run_live_ingestion

router = APIRouter(prefix="/api/sources", tags=["Data Sources & API Config"])

@router.get("")
def list_data_sources():
    conn = get_db()
    cursor = conn.cursor()

    rows = cursor.execute("SELECT * FROM data_sources_config ORDER BY is_live DESC, status ASC").fetchall()
    conn.close()

    return {
        "sources": [dict(r) for r in rows],
        "data_tiers_explained": {
            "LIVE": "Signals ingested within recent hours from live public wires and RSS monitoring.",
            "RECENT": "Verified events that transpired within the past 30-90 days.",
            "HISTORICAL": "Baseline dataset spanning the previous 12 months with verified timelines.",
            "DERIVED": "Metrics computed mathematically (e.g. Herfindahl concentration index, 0-100 risk score, lead time % stretch).",
            "AI-INFERRED": "Semantic causal connections and forward-looking risks derived by AI, explicitly labeled with confidence % and separated from verified facts.",
            "UNVERIFIED": "Tier 4 early whispers and social signals, flagged strictly as unconfirmed."
        }
    }

@router.post("/refresh")
def trigger_live_refresh():
    """Triggers on-demand ingestion run across live feeds."""
    result = run_live_ingestion()
    return result
