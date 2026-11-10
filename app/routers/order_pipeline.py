from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import json
from app.database import get_db

router = APIRouter(prefix="/api/order-pipeline", tags=["Order Pipeline & Landmark Orders"])

@router.get("")
def get_order_pipeline_summary(
    market_cap_tier: Optional[str] = None,
    sector: Optional[str] = None,
    execution_risk: Optional[str] = None,
    min_surge: Optional[float] = None,
    search: Optional[str] = None,
    sort_by: str = "surge_multiplier_desc"
):
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM order_book_companies WHERE 1=1"
    params = []

    if market_cap_tier and market_cap_tier != "All":
        if market_cap_tier == "Micro/Nano Cap":
            query += " AND market_cap_tier IN ('Micro Cap', 'Nano Cap')"
        else:
            query += " AND market_cap_tier = ?"
            params.append(market_cap_tier)

    if sector and sector != "All":
        query += " AND sector LIKE ?"
        params.append(f"%{sector}%")

    if execution_risk and execution_risk != "All":
        query += " AND execution_risk_level = ?"
        params.append(execution_risk)

    if min_surge and min_surge > 0:
        query += " AND surge_multiplier >= ?"
        params.append(min_surge)

    if search:
        s = f"%{search}%"
        query += """ AND (
            ticker LIKE ? OR company_name LIKE ? OR sector LIKE ? OR industry LIKE ?
            OR primary_material_bottleneck LIKE ? OR order_surge_thesis LIKE ?
        )"""
        params.extend([s, s, s, s, s, s])

    # Sorting options
    if sort_by == "surge_multiplier_desc":
        query += " ORDER BY surge_multiplier DESC"
    elif sort_by == "order_book_desc":
        query += " ORDER BY total_order_book_cr DESC"
    elif sort_by == "book_to_bill_desc":
        query += " ORDER BY book_to_bill_ratio DESC"
    elif sort_by == "market_cap_desc":
        query += " ORDER BY market_cap_inr_cr DESC"
    elif sort_by == "bidding_pipeline_desc":
        query += " ORDER BY bidding_pipeline_cr DESC"
    else:
        query += " ORDER BY surge_multiplier DESC"

    rows = cursor.execute(query, params).fetchall()

    # Overall system statistics (across entire order book database)
    all_rows = cursor.execute("SELECT * FROM order_book_companies").fetchall()
    total_companies = len(all_rows)
    cumulative_order_book = sum(r["total_order_book_cr"] for r in all_rows)
    cumulative_bidding_pipeline = sum(r["bidding_pipeline_cr"] for r in all_rows)
    total_combined_pipeline = cumulative_order_book + cumulative_bidding_pipeline
    recent_inflows_total = sum(r["recent_order_inflows_cr"] for r in all_rows)
    avg_surge = round(sum(r["surge_multiplier"] for r in all_rows) / total_companies, 2) if total_companies > 0 else 0
    high_visibility_cnt = sum(1 for r in all_rows if r["book_to_bill_ratio"] >= 2.0)
    critical_choke_cnt = sum(1 for r in all_rows if r["material_lead_time_weeks"] >= 45)

    tier_counts = {
        "Large Cap": sum(1 for r in all_rows if r["market_cap_tier"] == "Large Cap"),
        "Mid Cap": sum(1 for r in all_rows if r["market_cap_tier"] == "Mid Cap"),
        "Small Cap": sum(1 for r in all_rows if r["market_cap_tier"] == "Small Cap"),
        "Micro Cap": sum(1 for r in all_rows if r["market_cap_tier"] == "Micro Cap"),
        "Nano Cap": sum(1 for r in all_rows if r["market_cap_tier"] == "Nano Cap")
    }

    # Fetch total landmark orders count
    orders_cnt = cursor.execute("SELECT COUNT(*) FROM significant_orders").fetchone()[0]

    companies = []
    for r in rows:
        d = dict(r)
        d["total_pipeline_cr"] = round(d["total_order_book_cr"] + d["bidding_pipeline_cr"], 2)
        # Fetch landmark orders for this company
        ord_rows = cursor.execute(
            "SELECT id, client_name, client_category, order_value_cr, announcement_date, scope_of_work, order_significance_tag, pct_of_annual_revenue, surge_factor FROM significant_orders WHERE company_id = ? ORDER BY order_value_cr DESC",
            (d["id"],)
        ).fetchall()
        d["landmark_orders"] = [dict(o) for o in ord_rows]
        d["landmark_orders_count"] = len(d["landmark_orders"])
        companies.append(d)

    conn.close()

    return {
        "total_results": len(companies),
        "statistics": {
            "total_tracked_companies": total_companies,
            "cumulative_order_book_cr": round(cumulative_order_book, 2),
            "cumulative_bidding_pipeline_cr": round(cumulative_bidding_pipeline, 2),
            "total_combined_pipeline_cr": round(total_combined_pipeline, 2),
            "recent_inflows_total_cr": round(recent_inflows_total, 2),
            "avg_surge_multiplier": avg_surge,
            "high_visibility_companies": high_visibility_cnt,
            "critical_choke_count": critical_choke_cnt,
            "landmark_orders_count": orders_cnt,
            "tier_counts": tier_counts
        },
        "companies": companies
    }

@router.get("/orders")
def list_significant_orders(
    company_id: Optional[str] = None,
    ticker: Optional[str] = None,
    client_category: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "value_desc"
):
    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT o.*, c.market_cap_tier, c.sector, c.book_to_bill_ratio, c.surge_multiplier as company_surge_mult
        FROM significant_orders o
        JOIN order_book_companies c ON o.company_id = c.id
        WHERE 1=1
    """
    params = []

    if company_id:
        query += " AND o.company_id = ?"
        params.append(company_id)

    if ticker:
        query += " AND o.ticker = ?"
        params.append(ticker.upper())

    if client_category and client_category != "All":
        query += " AND o.client_category = ?"
        params.append(client_category)

    if tag and tag != "All":
        query += " AND o.order_significance_tag = ?"
        params.append(tag)

    if search:
        s = f"%{search}%"
        query += """ AND (
            o.ticker LIKE ? OR o.company_name LIKE ? OR o.client_name LIKE ?
            OR o.scope_of_work LIKE ? OR o.critical_raw_materials LIKE ?
        )"""
        params.extend([s, s, s, s, s])

    if sort_by == "value_desc":
        query += " ORDER BY o.order_value_cr DESC"
    elif sort_by == "value_asc":
        query += " ORDER BY o.order_value_cr ASC"
    elif sort_by == "surge_factor_desc":
        query += " ORDER BY o.surge_factor DESC"
    elif sort_by == "date_desc":
        query += " ORDER BY o.announcement_date DESC"
    elif sort_by == "pct_revenue_desc":
        query += " ORDER BY o.pct_of_annual_revenue DESC"
    else:
        query += " ORDER BY o.order_value_cr DESC"

    rows = cursor.execute(query, params).fetchall()
    orders = [dict(r) for r in rows]

    total_value = sum(o["order_value_cr"] for o in orders)

    conn.close()

    return {
        "total": len(orders),
        "total_order_value_cr": round(total_value, 2),
        "orders": orders
    }

@router.get("/company/{company_id}")
def get_company_order_detail(company_id: str):
    conn = get_db()
    cursor = conn.cursor()

    c_row = cursor.execute("SELECT * FROM order_book_companies WHERE id = ? OR ticker = ?", (company_id, company_id.upper())).fetchone()
    if not c_row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Company with identifier '{company_id}' not found.")

    company = dict(c_row)
    company["total_pipeline_cr"] = round(company["total_order_book_cr"] + company["bidding_pipeline_cr"], 2)

    o_rows = cursor.execute("SELECT * FROM significant_orders WHERE company_id = ? ORDER BY order_value_cr DESC", (company["id"],)).fetchall()
    company["significant_orders"] = [dict(o) for o in o_rows]

    conn.close()
    return company
