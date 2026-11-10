import json
from app.database import get_db

DEFAULT_WEIGHTS = {
    "supply_concentration": 0.20,
    "severity_of_disruption": 0.20,
    "price_movement": 0.15,
    "lead_time_increase": 0.15,
    "geopolitical_risk": 0.10,
    "substitutability": 0.10,
    "duration": 0.05,
    "downstream_criticality": 0.05
}

def get_risk_weights():
    conn = get_db()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM risk_weight_config WHERE id = 1").fetchone()
    conn.close()
    if row:
        return {
            "supply_concentration": row["supply_concentration"],
            "severity_of_disruption": row["severity_of_disruption"],
            "price_movement": row["price_movement"],
            "lead_time_increase": row["lead_time_increase"],
            "geopolitical_risk": row["geopolitical_risk"],
            "substitutability": row["substitutability"],
            "duration": row["duration"],
            "downstream_criticality": row["downstream_criticality"]
        }
    return DEFAULT_WEIGHTS

def update_risk_weights(new_weights: dict):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE risk_weight_config SET
        supply_concentration = ?,
        severity_of_disruption = ?,
        price_movement = ?,
        lead_time_increase = ?,
        geopolitical_risk = ?,
        substitutability = ?,
        duration = ?,
        downstream_criticality = ?
    WHERE id = 1
    """, (
        new_weights.get("supply_concentration", 0.20),
        new_weights.get("severity_of_disruption", 0.20),
        new_weights.get("price_movement", 0.15),
        new_weights.get("lead_time_increase", 0.15),
        new_weights.get("geopolitical_risk", 0.10),
        new_weights.get("substitutability", 0.10),
        new_weights.get("duration", 0.05),
        new_weights.get("downstream_criticality", 0.05)
    ))
    conn.commit()
    conn.close()
    return get_risk_weights()

def calculate_composite_risk_score(factors: dict, weights: dict = None) -> dict:
    """
    Computes transparent risk score (0-100).
    Factors expect values from 0-100:
    - supply_concentration (0-100)
    - severity_of_disruption (0-100)
    - price_movement (0-100)
    - lead_time_increase (0-100)
    - geopolitical_risk (0-100)
    - substitutability (0-100, where 100 = impossible to substitute)
    - duration (0-100, where 100 = permanent/multi-year)
    - downstream_criticality (0-100, where 100 = existential to global GDP/defence)
    """
    if weights is None:
        weights = get_risk_weights()

    # Normalize weights if sum != 1.0
    total_weight = sum(weights.values()) or 1.0
    norm_weights = {k: v / total_weight for k, v in weights.items()}

    breakdown = {}
    weighted_sum = 0.0

    for key, weight in norm_weights.items():
        val = float(factors.get(key, 50.0))
        val = max(0.0, min(100.0, val))
        contribution = val * weight
        weighted_sum += contribution
        breakdown[key] = {
            "input_score": round(val, 1),
            "weight": round(weight, 3),
            "weighted_points": round(contribution, 1)
        }

    total_score = round(weighted_sum, 1)
    
    if total_score <= 20:
        level = "Minimal"
        color = "#10b981" # Green
    elif total_score <= 40:
        level = "Low"
        color = "#34d399" # Light green
    elif total_score <= 60:
        level = "Moderate"
        color = "#f59e0b" # Amber
    elif total_score <= 80:
        level = "High"
        color = "#f97316" # Orange
    else:
        level = "Critical"
        color = "#ef4444" # Red

    return {
        "score": total_score,
        "level": level,
        "color": color,
        "breakdown": breakdown,
        "formula": "20% Concentration + 20% Disruption Severity + 15% Price + 15% Lead Time + 10% Geopolitics + 10% Substitutability + 5% Duration + 5% Downstream Criticality"
    }

def calculate_early_warning_score(concentration: float, geopolitical_tension: float, policy_signal: bool, inventory_falling: bool, lead_time_increasing: bool) -> dict:
    """
    Early Warning Score identifies risks that are not yet peak severity but have high momentum.
    """
    score = 0.0
    indicators = []

    # Supply concentration factor
    if concentration >= 70:
        score += 25
        indicators.append(f"High concentration ({concentration:.0f}% in dominant supplier/region)")
    elif concentration >= 45:
        score += 15
        indicators.append(f"Moderate concentration ({concentration:.0f}%)")

    # Geopolitical factor
    if geopolitical_tension >= 70:
        score += 25
        indicators.append("Elevated geopolitical tension / active conflict zone")
    elif geopolitical_tension >= 40:
        score += 15
        indicators.append("Rising geopolitical friction / trade friction")

    # Policy factor
    if policy_signal:
        score += 25
        indicators.append("Export control, tariff, or regulatory sanction enacted / pending")

    # Inventory drawdown factor
    if inventory_falling:
        score += 15
        indicators.append("Stockpile depletion / buffer inventory falling below safe threshold")

    # Lead time momentum factor
    if lead_time_increasing:
        score += 10
        indicators.append("Lead time stretch detected in supplier purchase orders")

    score = min(100.0, score)

    if score >= 75:
        level = "CRITICAL EARLY WARNING"
        color = "#ef4444"
    elif score >= 50:
        level = "HIGH EARLY WARNING"
        color = "#f97316"
    elif score >= 30:
        level = "ELEVATED SIGNAL"
        color = "#f59e0b"
    else:
        level = "STABLE / LOW"
        color = "#10b981"

    return {
        "score": round(score, 1),
        "level": level,
        "color": color,
        "indicators": indicators
    }
