from fastapi import APIRouter, HTTPException
import uuid
from datetime import datetime
from app.database import get_db

router = APIRouter(prefix="/api/alerts", tags=["Alerts System"])

@router.get("/notifications")
def get_notifications(unread_only: bool = False):
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM alert_notifications"
    if unread_only:
        query += " WHERE is_read = 0"
    query += " ORDER BY timestamp DESC"

    rows = cursor.execute(query).fetchall()
    conn.close()
    return {"total": len(rows), "notifications": [dict(r) for r in rows]}

@router.post("/notifications/{notif_id}/read")
def mark_read(notif_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE alert_notifications SET is_read = 1 WHERE id = ?", (notif_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@router.get("/configs")
def get_alert_configs():
    conn = get_db()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM alerts_config ORDER BY created_at DESC").fetchall()
    conn.close()
    return {"configs": [dict(r) for r in rows]}

@router.post("/configs")
def create_alert_config(payload: dict):
    conn = get_db()
    cursor = conn.cursor()

    cfg_id = f"alt-{uuid.uuid4().hex[:6]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT INTO alerts_config (id, name, condition_type, threshold_value, target_entity, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        cfg_id,
        payload.get("name", "Custom Alert Rule"),
        payload.get("condition_type", "SUPPLY_RISK_GTE"),
        float(payload.get("threshold_value", 75.0)),
        payload.get("target_entity", "ALL"),
        1,
        now_str
    ))

    # Also simulate generating a test trigger notification
    cursor.execute("""
    INSERT INTO alert_notifications (id, alert_config_id, event_id, title, message, severity, timestamp, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    """, (
        f"notif-{uuid.uuid4().hex[:6]}",
        cfg_id,
        None,
        f"RULE ARMED: {payload.get('name')}",
        f"Monitoring system configured for threshold: {payload.get('threshold_value')} ({payload.get('condition_type')})",
        "Moderate",
        now_str
    ))

    conn.commit()
    conn.close()
    return {"status": "success", "id": cfg_id}
