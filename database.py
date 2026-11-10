import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "supply_chain_intel.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT,
        country TEXT NOT NULL,
        region TEXT,
        specific_location TEXT,
        start_date TEXT NOT NULL,
        reported_date TEXT NOT NULL,
        escalation_date TEXT,
        latest_update TEXT NOT NULL,
        expected_end_date TEXT,
        status TEXT NOT NULL,
        severity REAL NOT NULL,
        confidence_score REAL NOT NULL,
        confidence_breakdown TEXT,
        primary_cause TEXT NOT NULL,
        secondary_causes TEXT,
        trigger_event TEXT,
        geopolitical_cause TEXT,
        policy_cause TEXT,
        natural_cause TEXT,
        operational_cause TEXT,
        material_affected TEXT NOT NULL,
        commodity_affected TEXT,
        component_affected TEXT,
        supplier_affected TEXT,
        factory_affected TEXT,
        country_affected TEXT,
        est_production_impact TEXT,
        est_capacity_impact TEXT,
        supply_reduction_pct REAL,
        price_impact TEXT,
        price_direction TEXT,
        price_pct_change REAL,
        price_pressure_category TEXT,
        lead_time_impact TEXT,
        normal_lead_time_weeks REAL,
        current_lead_time_weeks REAL,
        lead_time_change_pct REAL,
        availability_impact TEXT,
        freight_impact TEXT,
        downstream_industries TEXT,
        expected_duration TEXT,
        prob_continuation REAL,
        prob_escalation REAL,
        expected_price_pressure TEXT,
        expected_shortage_risk TEXT,
        expected_lead_time_risk TEXT,
        data_type TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        summary_executive TEXT,
        why_it_matters TEXT,
        what_is_affected TEXT,
        what_could_happen_next TEXT,
        evidence TEXT
    );

    CREATE TABLE IF NOT EXISTS event_sources (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        source_name TEXT NOT NULL,
        url TEXT,
        publication_date TEXT,
        source_tier TEXT NOT NULL,
        source_type TEXT NOT NULL,
        reliability_score REAL NOT NULL,
        quoted_evidence TEXT,
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS event_timeline (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        milestone_date TEXT NOT NULL,
        milestone_title TEXT NOT NULL,
        description TEXT,
        milestone_type TEXT NOT NULL,
        order_idx INTEGER DEFAULT 0,
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS causal_links (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        step_order INTEGER NOT NULL,
        from_node TEXT NOT NULL,
        to_node TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        confidence_pct REAL NOT NULL,
        notes TEXT,
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS commodities_materials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        current_risk_score REAL NOT NULL,
        early_warning_score REAL NOT NULL,
        price_pressure_status TEXT NOT NULL,
        supply_risk_level TEXT NOT NULL,
        lead_time_status TEXT,
        normal_lead_time_weeks REAL,
        current_lead_time_weeks REAL,
        lead_time_pct_change REAL,
        main_cause TEXT,
        top_producing_countries TEXT,
        top_processing_countries TEXT,
        mining_concentration_pct REAL,
        processing_concentration_pct REAL,
        single_point_of_failure INTEGER DEFAULT 0,
        spof_reason TEXT,
        substitute_available TEXT,
        switching_difficulty TEXT,
        qualification_time TEXT,
        alternative_suppliers TEXT,
        alternative_countries TEXT,
        downstream_industries TEXT,
        key_downstream_components TEXT,
        tracking_since TEXT,
        last_updated TEXT
    );

    CREATE TABLE IF NOT EXISTS critical_components (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sector TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        risk_score REAL NOT NULL,
        normal_lead_time_weeks REAL,
        current_lead_time_weeks REAL,
        lead_time_pct_increase REAL,
        affected_suppliers TEXT,
        bottleneck_reason TEXT,
        key_precursors TEXT,
        single_point_of_failure INTEGER DEFAULT 0,
        spof_notes TEXT,
        substitutability TEXT,
        downstream_impact TEXT,
        last_updated TEXT
    );

    CREATE TABLE IF NOT EXISTS policies (
        id TEXT PRIMARY KEY,
        policy_name TEXT NOT NULL,
        country TEXT NOT NULL,
        policy_type TEXT NOT NULL,
        announcement_date TEXT NOT NULL,
        effective_date TEXT NOT NULL,
        status TEXT NOT NULL,
        affected_materials TEXT,
        affected_countries TEXT,
        affected_suppliers TEXT,
        supply_impact TEXT,
        price_impact TEXT,
        downstream_impact TEXT,
        causal_chain_summary TEXT,
        source_ref TEXT
    );

    CREATE TABLE IF NOT EXISTS industries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE,
        icon TEXT,
        overall_risk_score REAL NOT NULL,
        active_disruptions_count INTEGER DEFAULT 0,
        value_chain_nodes TEXT,
        critical_dependencies TEXT,
        vulnerabilities_summary TEXT
    );

    CREATE TABLE IF NOT EXISTS alerts_config (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        condition_type TEXT NOT NULL,
        threshold_value REAL,
        target_entity TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alert_notifications (
        id TEXT PRIMARY KEY,
        alert_config_id TEXT,
        event_id TEXT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        is_read INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS data_sources_config (
        id TEXT PRIMARY KEY,
        source_name TEXT NOT NULL,
        category TEXT NOT NULL,
        source_type TEXT NOT NULL,
        endpoint_url TEXT,
        api_key_env_var TEXT,
        status TEXT NOT NULL,
        is_live INTEGER DEFAULT 0,
        description TEXT,
        data_provided TEXT,
        why_needed TEXT,
        last_checked TEXT,
        items_ingested INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS risk_weight_config (
        id INTEGER PRIMARY KEY,
        supply_concentration REAL DEFAULT 0.20,
        severity_of_disruption REAL DEFAULT 0.20,
        price_movement REAL DEFAULT 0.15,
        lead_time_increase REAL DEFAULT 0.15,
        geopolitical_risk REAL DEFAULT 0.10,
        substitutability REAL DEFAULT 0.10,
        duration REAL DEFAULT 0.05,
        downstream_criticality REAL DEFAULT 0.05
    );

    CREATE TABLE IF NOT EXISTS indian_stocks_impact (
        id TEXT PRIMARY KEY,
        ticker TEXT NOT NULL,
        exchange TEXT DEFAULT 'NSE',
        company_name TEXT NOT NULL,
        market_cap_tier TEXT NOT NULL,
        market_cap_inr_cr REAL,
        sector TEXT NOT NULL,
        industry TEXT NOT NULL,
        primary_materials_exposed TEXT,
        disruption_event_ids TEXT,
        impact_direction TEXT NOT NULL,
        impact_nature TEXT NOT NULL,
        lead_time_sensitivity TEXT,
        price_rise_sensitivity TEXT,
        pricing_power_passthrough TEXT,
        ebitda_margin_risk_pct REAL,
        transmission_mechanism TEXT NOT NULL,
        impact_summary TEXT NOT NULL,
        beneficiary_thesis TEXT,
        key_products_at_risk TEXT,
        cogs_exposure_pct REAL,
        last_updated TEXT
    );

    CREATE TABLE IF NOT EXISTS order_book_companies (
        id TEXT PRIMARY KEY,
        ticker TEXT NOT NULL,
        exchange TEXT DEFAULT 'NSE',
        company_name TEXT NOT NULL,
        market_cap_tier TEXT NOT NULL,
        market_cap_inr_cr REAL,
        sector TEXT NOT NULL,
        industry TEXT NOT NULL,
        total_order_book_cr REAL NOT NULL,
        ttm_revenue_cr REAL NOT NULL,
        book_to_bill_ratio REAL NOT NULL,
        recent_order_inflows_cr REAL NOT NULL,
        historical_avg_order_size_cr REAL NOT NULL,
        recent_avg_order_size_cr REAL NOT NULL,
        surge_multiplier REAL NOT NULL,
        bidding_pipeline_cr REAL NOT NULL,
        delivery_timeline_months INTEGER NOT NULL,
        execution_risk_level TEXT NOT NULL,
        primary_material_bottleneck TEXT NOT NULL,
        material_lead_time_weeks INTEGER NOT NULL,
        order_surge_thesis TEXT NOT NULL,
        last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS significant_orders (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        ticker TEXT NOT NULL,
        company_name TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_category TEXT NOT NULL,
        order_value_cr REAL NOT NULL,
        announcement_date TEXT NOT NULL,
        scope_of_work TEXT NOT NULL,
        execution_period_months INTEGER NOT NULL,
        historical_avg_benchmark_cr REAL NOT NULL,
        surge_factor REAL NOT NULL,
        order_significance_tag TEXT NOT NULL,
        pct_of_annual_revenue REAL NOT NULL,
        critical_raw_materials TEXT NOT NULL,
        bottleneck_impact_note TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Under Execution',
        FOREIGN KEY (company_id) REFERENCES order_book_companies (id)
    );

    CREATE TABLE IF NOT EXISTS supply_shortage_articles (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        category TEXT NOT NULL,
        shortage_severity TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        market_size_tam_usd_bn REAL NOT NULL,
        market_size_india_inr_cr REAL NOT NULL,
        tam_cagr_pct REAL NOT NULL,
        lead_time_current_weeks INTEGER NOT NULL,
        what_is_short_and_why TEXT NOT NULL,
        world_opportunities_and_challenges TEXT NOT NULL,
        india_opportunities_and_challenges TEXT NOT NULL,
        market_size_and_tam_analysis TEXT NOT NULL,
        global_and_indian_actions_to_fix TEXT NOT NULL,
        full_article_markdown TEXT NOT NULL,
        key_companies_global TEXT,
        key_companies_indian TEXT,
        published_date TEXT NOT NULL,
        last_updated TEXT NOT NULL
    );

    -- Indices for query performance
    CREATE INDEX IF NOT EXISTS idx_events_category ON events (category);
    CREATE INDEX IF NOT EXISTS idx_events_country ON events (country);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);
    CREATE INDEX IF NOT EXISTS idx_events_start_date ON events (start_date);
    CREATE INDEX IF NOT EXISTS idx_events_severity ON events (severity);
    CREATE INDEX IF NOT EXISTS idx_events_data_type ON events (data_type);
    CREATE INDEX IF NOT EXISTS idx_sources_event_id ON event_sources (event_id);
    CREATE INDEX IF NOT EXISTS idx_timeline_event_id ON event_timeline (event_id);
    CREATE INDEX IF NOT EXISTS idx_causal_event_id ON causal_links (event_id);
    CREATE INDEX IF NOT EXISTS idx_indian_stocks_tier ON indian_stocks_impact (market_cap_tier);
    CREATE INDEX IF NOT EXISTS idx_indian_stocks_direction ON indian_stocks_impact (impact_direction);
    CREATE INDEX IF NOT EXISTS idx_indian_stocks_nature ON indian_stocks_impact (impact_nature);
    CREATE INDEX IF NOT EXISTS idx_indian_stocks_sector ON indian_stocks_impact (sector);
    CREATE INDEX IF NOT EXISTS idx_order_book_tier ON order_book_companies (market_cap_tier);
    CREATE INDEX IF NOT EXISTS idx_order_book_sector ON order_book_companies (sector);
    CREATE INDEX IF NOT EXISTS idx_order_book_surge ON order_book_companies (surge_multiplier);
    CREATE INDEX IF NOT EXISTS idx_sig_orders_company_id ON significant_orders (company_id);
    CREATE INDEX IF NOT EXISTS idx_sig_orders_ticker ON significant_orders (ticker);
    CREATE INDEX IF NOT EXISTS idx_sig_orders_value ON significant_orders (order_value_cr);
    CREATE INDEX IF NOT EXISTS idx_articles_item_id ON supply_shortage_articles (item_id);
    CREATE INDEX IF NOT EXISTS idx_articles_category ON supply_shortage_articles (category);
    CREATE INDEX IF NOT EXISTS idx_articles_severity ON supply_shortage_articles (shortage_severity);
    """)

    # Initialize default risk weight configuration if empty
    cursor.execute("SELECT COUNT(*) FROM risk_weight_config")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO risk_weight_config (id, supply_concentration, severity_of_disruption, price_movement, lead_time_increase, geopolitical_risk, substitutability, duration, downstream_criticality)
        VALUES (1, 0.20, 0.20, 0.15, 0.15, 0.10, 0.10, 0.05, 0.05)
        """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database schema successfully initialized.")
