// Global Intelligence Dashboard - Master Application Controller
let currentView = 'command-center';
let allEventsCache = [];
let allCommoditiesCache = [];
let currentRiskWeights = {};

document.addEventListener('DOMContentLoaded', () => {
  initTerminal();
});

async function initTerminal() {
  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  // Setup tab routing
  setupNavigation();

  // Load initial Command Center data
  await refreshCommandCenter();
  await loadNotificationsBadge();

  // Initialize charts
  if (typeof initCharts === 'function') initCharts();
}

function updateLiveClock() {
  const el = document.getElementById('terminal-live-time');
  if (el) {
    const now = new Date();
    el.innerText = now.toUTCString().replace('GMT', 'UTC');
  }
}

function setupNavigation() {
  const navButtons = document.querySelectorAll('[data-view-target]');
  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-view-target');
      switchView(target);
    });
  });
}

function switchView(viewName) {
  currentView = viewName;

  // Update nav item active classes
  document.querySelectorAll('[data-view-target]').forEach(btn => {
    const target = btn.getAttribute('data-view-target');
    if (target === viewName) {
      btn.classList.add('bg-slate-800', 'text-cyan-400', 'border-l-2', 'border-cyan-400');
      btn.classList.remove('text-slate-400');
    } else {
      btn.classList.remove('bg-slate-800', 'text-cyan-400', 'border-l-2', 'border-cyan-400');
      btn.classList.add('text-slate-400');
    }
  });

  // Hide all view sections
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.add('hidden');
  });

  // Show target section
  const targetSection = document.getElementById(`view-${viewName}`);
  if (targetSection) {
    targetSection.classList.remove('hidden');
  }

  // View specific data loaders
  if (viewName === 'command-center') refreshCommandCenter();
  else if (viewName === 'live-events') loadLiveEventsView();
  else if (viewName === 'commodities') loadCommoditiesView();
  else if (viewName === 'critical-materials') loadCriticalMaterialsView();
  else if (viewName === 'components') loadComponentsView();
  else if (viewName === 'semiconductors') loadSemiconductorsView();
  else if (viewName === 'supply-chains') loadSupplyChainsView();
  else if (viewName === 'policy-tracker') loadPoliciesView();
  else if (viewName === 'geopolitical') loadGeopoliticalView();
  else if (viewName === 'price-pressure') loadPricePressureView();
  else if (viewName === 'lead-times') loadLeadTimesView();
  else if (viewName === 'industry-impact') loadIndustriesView();
  else if (viewName === 'indian-stocks') loadIndianStocksView();
  else if (viewName === 'order-pipeline') loadOrderPipelineView();
  else if (viewName === 'shortage-articles') loadShortageArticlesView();
  else if (viewName === 'global-map') {
    setTimeout(() => {
      if (typeof initIntelligenceMap === 'function') initIntelligenceMap();
      if (typeof loadMapMarkers === 'function') loadMapMarkers();
    }, 100);
  }
  else if (viewName === 'historical-timeline') loadHistoricalTimelineView();
  else if (viewName === 'alerts') loadAlertsView();
  else if (viewName === 'data-sources') loadDataSourcesView();
}

// ==========================================
// 1. COMMAND CENTER
// ==========================================
async function refreshCommandCenter() {
  try {
    const [kpiRes, top20Res, changedRes, expRes, alreadyExpRes, hardBuyRes] = await Promise.all([
      fetch('/api/analytics/command_center').then(r => r.json()),
      fetch('/api/analytics/top20').then(r => r.json()),
      fetch('/api/analytics/what_changed_today').then(r => r.json()),
      fetch('/api/analytics/what_could_become_expensive').then(r => r.json()),
      fetch('/api/analytics/what_is_already_expensive').then(r => r.json()),
      fetch('/api/analytics/what_is_harder_to_buy').then(r => r.json())
    ]);

    // Populate Top-level KPI cards
    document.getElementById('kpi-global-risk-badge').innerHTML = kpiRes.global_supply_risk.badge;
    document.getElementById('kpi-global-risk-badge').style.color = kpiRes.global_supply_risk.color;
    document.getElementById('kpi-active-disruptions').innerText = kpiRes.active_disruptions;
    document.getElementById('kpi-price-pressure').innerText = kpiRes.price_pressure_events;
    document.getElementById('kpi-lead-times').innerText = kpiRes.lead_time_risks;
    document.getElementById('kpi-new-7d').innerText = kpiRes.new_events_last_7_days;
    document.getElementById('kpi-escalating').innerText = kpiRes.escalating_events;
    document.getElementById('kpi-crit-materials').innerText = kpiRes.critical_materials_at_risk;
    document.getElementById('terminal-last-sync').innerText = kpiRes.last_refresh;

    if (typeof renderGlobalRiskGauge === 'function') {
      renderGlobalRiskGauge(kpiRes.global_supply_risk.average_severity);
    }

    // Populate "WHAT CHANGED TODAY?"
    renderWhatChangedToday(changedRes.changelog);

    // Populate TOP 20 GLOBAL SUPPLY-CHAIN RISKS
    renderTop20Table(top20Res.top_risks);

    // Populate WHAT COULD BECOME EXPENSIVE
    renderWhatCouldBecomeExpensive(expRes.forecasts);

    // Populate WHAT IS ALREADY GETTING EXPENSIVE
    renderWhatIsAlreadyExpensive(alreadyExpRes.confirmed_increases);

    // Populate WHAT IS BECOMING HARDER TO BUY
    renderWhatIsHarderToBuy(hardBuyRes.hard_to_buy);

  } catch (err) {
    console.error("Failed to refresh Command Center:", err);
  }
}

function renderWhatChangedToday(items) {
  const container = document.getElementById('what-changed-today-list');
  if (!container) return;

  container.innerHTML = items.map(item => `
    <div class="p-2.5 rounded bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-start gap-2.5 cursor-pointer text-xs" onclick="openEventDetail('${item.event_id}')">
      <span class="text-base">${item.icon}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-1 mb-0.5">
          <span class="font-bold text-slate-200 truncate">${item.headline}</span>
          <span class="text-[10px] terminal-badge px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono shrink-0">${item.data_type}</span>
        </div>
        <div class="text-slate-400 text-[11px] flex items-center justify-between">
          <span class="text-rose-400 font-mono">${item.price_impact || 'Monitoring price volatility'}</span>
          <span class="text-slate-500 font-mono">${item.timestamp}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderTop20Table(risks) {
  const container = document.getElementById('top20-risks-table-body');
  if (!container) return;

  container.innerHTML = risks.map(r => {
    const sevBadge = r.severity >= 85 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                     r.severity >= 70 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                     'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40';

    return `
      <tr class="hover:bg-slate-800/40 cursor-pointer text-xs" onclick="openEventDetail('${r.id}')">
        <td class="font-mono font-bold text-cyan-400">#${r.rank}</td>
        <td>
          <div class="font-semibold text-slate-200">${r.material_affected}</div>
          <div class="text-[11px] text-slate-400 truncate max-w-xs">${r.title}</div>
        </td>
        <td><span class="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">${r.country}</span></td>
        <td><span class="terminal-badge px-2 py-0.5 rounded ${sevBadge}">${r.severity.toFixed(0)} / 100</span></td>
        <td class="text-rose-400 font-mono">${r.price_impact || 'Price Pressure'}</td>
        <td class="text-amber-400 font-mono">${r.lead_time_impact || 'Lead-time stretch'}</td>
        <td>
          <span class="terminal-badge px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">${r.status}</span>
        </td>
        <td class="text-right">
          <button class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-[11px]">
            Inspect $\\rightarrow$
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderWhatCouldBecomeExpensive(forecasts) {
  const container = document.getElementById('what-could-become-expensive-container');
  if (!container) return;

  container.innerHTML = forecasts.map(f => `
    <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 space-y-1.5 text-xs">
      <div class="flex items-center justify-between">
        <span class="font-bold text-sm text-amber-400 flex items-center gap-1.5">
          <i class="fa-solid fa-arrow-trend-up"></i> ${f.material}
        </span>
        <span class="terminal-badge px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
          ${f.outlook}
        </span>
      </div>
      <div class="text-slate-300"><span class="text-slate-500 font-mono uppercase text-[10px]">Cause:</span> ${f.why}</div>
      <div class="text-slate-400 text-[11px]"><span class="text-slate-500 font-mono uppercase text-[10px]">Evidence:</span> ${f.evidence}</div>
      <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80 text-slate-400 font-mono">
        <span>Timeframe: <span class="text-slate-200">${f.expected_timeframe}</span></span>
        <span class="text-cyan-400">${f.confidence}</span>
      </div>
    </div>
  `).join('');
}

function renderWhatIsAlreadyExpensive(items) {
  const container = document.getElementById('what-is-already-expensive-container');
  if (!container) return;

  container.innerHTML = items.map(item => `
    <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 space-y-1 text-xs cursor-pointer" onclick="openEventDetail('${item.event_id}')">
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-200">${item.material}</span>
        <span class="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
          ${item.price_change}
        </span>
      </div>
      <div class="text-slate-400 text-[11px]">${item.cause}</div>
      <div class="text-[10px] text-slate-500 font-mono truncate"><i class="fa-solid fa-check-double text-emerald-400 mr-1"></i>Verified: ${item.evidence}</div>
    </div>
  `).join('');
}

function renderWhatIsHarderToBuy(items) {
  const container = document.getElementById('what-is-harder-to-buy-container');
  if (!container) return;

  container.innerHTML = items.map(item => `
    <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 space-y-1 text-xs cursor-pointer" onclick="openEventDetail('${item.event_id}')">
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-200">${item.product_material}</span>
        <span class="terminal-badge px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
          Allocation / Deficit
        </span>
      </div>
      <div class="text-slate-300 font-medium">${item.availability_status}</div>
      <div class="text-amber-400 font-mono text-[11px] flex items-center justify-between">
        <span>Lead Time: ${item.lead_time}</span>
        <span class="text-slate-500 font-mono">${item.operational_status}</span>
      </div>
    </div>
  `).join('');
}

// ==========================================
// 2. LIVE EVENTS VIEW
// ==========================================
async function loadLiveEventsView() {
  const categoryFilter = document.getElementById('filter-category')?.value || 'All';
  const statusFilter = document.getElementById('filter-status')?.value || 'All';
  const dataTypeFilter = document.getElementById('filter-datatype')?.value || 'All';
  const searchFilter = document.getElementById('filter-search')?.value.trim() || '';

  const params = new URLSearchParams();
  if (categoryFilter !== 'All') params.append('category', categoryFilter);
  if (statusFilter !== 'All') params.append('status', statusFilter);
  if (dataTypeFilter !== 'All') params.append('data_type', dataTypeFilter);
  if (searchFilter) params.append('search', searchFilter);

  try {
    const res = await fetch(`/api/events?${params.toString()}`);
    const data = await res.json();
    allEventsCache = data.events;

    const badge = document.getElementById('live-events-count-badge');
    if (badge) {
      badge.textContent = `${data.total} Disruptions`;
    }

    const listEl = document.getElementById('live-events-container');
    if (!listEl) return;

    if (data.events.length === 0) {
      listEl.innerHTML = `
        <div class="p-12 text-center text-slate-500 font-mono">
          <i class="fa-solid fa-filter-circle-xmark text-4xl mb-3 text-slate-600"></i>
          <p>No disruptions match the selected query criteria.</p>
          <button onclick="resetLiveEventsFilters()" class="mt-3 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-xs border border-cyan-500/30">
            <i class="fa-solid fa-rotate-left mr-1.5"></i> Clear All Filters
          </button>
        </div>`;
      return;
    }

    listEl.innerHTML = data.events.map(ev => {
      const typeBadge = ev.data_type === 'LIVE' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' :
                        ev.data_type === 'HISTORICAL' ? 'bg-slate-700/40 text-slate-300 border border-slate-600' :
                        'bg-purple-500/20 text-purple-400 border border-purple-500/40';

      const sevColor = ev.severity >= 85 ? 'text-rose-400' : ev.severity >= 70 ? 'text-amber-400' : 'text-cyan-400';

      return `
        <div class="p-4 rounded-lg terminal-card hover:border-slate-600 cursor-pointer space-y-3" onclick="openEventDetail('${ev.id}')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="terminal-badge px-2 py-0.5 rounded ${typeBadge}">
                <i class="fa-solid fa-circle text-[6px] mr-1 ${ev.data_type === 'LIVE' ? 'live-pulse text-cyan-400' : ''}"></i>${ev.data_type}
              </span>
              <span class="text-xs font-mono text-slate-400 uppercase tracking-wider">${ev.category}</span>
              <span class="text-xs font-mono text-slate-500">|</span>
              <span class="text-xs font-mono text-slate-300"><i class="fa-solid fa-location-dot mr-1 text-slate-400"></i>${ev.country}</span>
            </div>
            
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-slate-400">Confidence: <span class="text-emerald-400 font-bold">${ev.confidence_score ? ev.confidence_score.toFixed(0) : 90}%</span></span>
              <span class="text-sm font-mono font-bold ${sevColor}">SEV ${ev.severity ? ev.severity.toFixed(0) : 75}</span>
            </div>
          </div>

          <div>
            <h3 class="text-base font-bold text-slate-100 hover:text-cyan-300 transition-colors leading-snug mb-1">
              ${ev.title}
            </h3>
            <p class="text-xs text-slate-400 line-clamp-2">${ev.summary_executive || ev.primary_cause}</p>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
            <div>
              <span class="text-slate-500 uppercase text-[10px]">Material:</span>
              <div class="text-slate-200 font-semibold truncate">${ev.material_affected || 'N/A'}</div>
            </div>
            <div>
              <span class="text-slate-500 uppercase text-[10px]">Price Impact:</span>
              <div class="text-rose-400 truncate">${ev.price_impact || 'Stable'}</div>
            </div>
            <div>
              <span class="text-slate-500 uppercase text-[10px]">Lead Time:</span>
              <div class="text-amber-400 truncate">${ev.lead_time_impact || 'Normal'}</div>
            </div>
            <div>
              <span class="text-slate-500 uppercase text-[10px]">Status:</span>
              <div class="text-slate-200 truncate">${ev.status} (Since ${ev.start_date || 'N/A'})</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error("Failed to load events view:", err);
  }
}

function resetLiveEventsFilters() {
  const cat = document.getElementById('filter-category');
  if (cat) cat.value = 'All';
  const stat = document.getElementById('filter-status');
  if (stat) stat.value = 'All';
  const dt = document.getElementById('filter-datatype');
  if (dt) dt.value = 'All';
  const s = document.getElementById('filter-search');
  if (s) s.value = '';
  loadLiveEventsView();
}

// ==========================================
// 3. COMMODITIES & MATERIALS WATCHLIST
// ==========================================
async function loadCommoditiesView() {
  const catFilter = document.getElementById('filter-comm-category')?.value || 'All';
  const spofOnly = document.getElementById('filter-comm-spof')?.checked || false;
  const search = document.getElementById('filter-comm-search')?.value.toLowerCase().trim() || '';

  try {
    const params = new URLSearchParams();
    if (catFilter !== 'All') params.append('category', catFilter);
    if (spofOnly) params.append('spof_only', 'true');
    if (search) params.append('search', search);

    const res = await fetch(`/api/commodities?${params.toString()}`);
    const data = await res.json();
    allCommoditiesCache = data.commodities;

    const badge = document.getElementById('commodities-count-badge');
    if (badge) {
      badge.textContent = `${data.commodities.length} Tracked`;
    }

    const tbody = document.getElementById('commodities-table-body');
    if (!tbody) return;

    if (data.commodities.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-500 font-mono">No commodities match current filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.commodities.map(m => {
      const riskBadge = m.current_risk_score >= 80 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                        m.current_risk_score >= 65 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';

      const spofBadge = m.single_point_of_failure ?
        '<span class="terminal-badge px-1.5 py-0.5 rounded bg-rose-600/30 text-rose-300 border border-rose-500/60 font-mono">SPOF</span>' :
        '<span class="text-slate-600 font-mono text-xs">—</span>';

      return `
        <tr class="hover:bg-slate-800/40 cursor-pointer text-xs" onclick="openMaterialDetail('${m.id}')">
          <td class="font-bold text-slate-100 flex items-center gap-1.5">
            <i class="fa-solid fa-cube text-slate-500 text-[10px]"></i>
            ${m.name}
          </td>
          <td><span class="font-mono text-slate-400">${m.category}</span></td>
          <td><span class="terminal-badge px-2 py-0.5 rounded ${riskBadge}">${m.current_risk_score.toFixed(0)}</span></td>
          <td class="font-mono text-amber-400 font-bold">${m.early_warning_score.toFixed(0)}</td>
          <td class="text-rose-400 font-mono font-semibold">${m.price_pressure_status}</td>
          <td class="text-amber-400 font-mono">${m.lead_time_status}</td>
          <td>${spofBadge}</td>
          <td class="font-mono text-slate-300">${m.mining_concentration_pct.toFixed(0)}% / ${m.processing_concentration_pct.toFixed(0)}%</td>
          <td class="text-slate-300">${m.substitute_available} (${m.switching_difficulty})</td>
          <td class="text-slate-400 truncate max-w-xs">${m.main_cause}</td>
          <td class="text-right">
            <button onclick="event.stopPropagation(); openArticleModal('${m.id}')" class="px-2 py-0.5 rounded bg-purple-950 hover:bg-purple-800 text-purple-300 hover:text-white font-mono text-[10px] border border-purple-500/40 transition-colors inline-flex items-center gap-1">
              <i class="fa-solid fa-book-open"></i> Dossier
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error("Failed to load commodities view:", err);
  }
}

function resetCommoditiesFilters() {
  const cat = document.getElementById('filter-comm-category');
  if (cat) cat.value = 'All';
  const spof = document.getElementById('filter-comm-spof');
  if (spof) spof.checked = false;
  const s = document.getElementById('filter-comm-search');
  if (s) s.value = '';
  loadCommoditiesView();
}

function openMaterialDetail(id) {
  openArticleModal(id);
}

// ==========================================
// 4. CRITICAL MATERIALS & CONCENTRATION VIEW
// ==========================================
async function loadCriticalMaterialsView() {
  const countryFilter = document.getElementById('filter-cm-country')?.value || 'All';
  const search = document.getElementById('filter-cm-search')?.value.toLowerCase().trim() || '';

  try {
    const res = await fetch('/api/commodities?spof_only=true');
    const data = await res.json();

    let items = data.commodities;
    if (countryFilter !== 'All') {
      items = items.filter(m => {
        const topProc = (m.top_processing_countries || []).map(p => p.country).join(' ');
        const topProd = (m.top_producing_countries || []).map(p => p.country).join(' ');
        const spofReason = m.spof_reason || '';
        return topProc.includes(countryFilter) || topProd.includes(countryFilter) || spofReason.includes(countryFilter);
      });
    }

    if (search) {
      items = items.filter(m => 
        m.name.toLowerCase().includes(search) || 
        (m.spof_reason && m.spof_reason.toLowerCase().includes(search))
      );
    }

    const badge = document.getElementById('critical-materials-count-badge');
    if (badge) {
      badge.textContent = `${items.length} SPOF Nodes`;
    }

    const container = document.getElementById('critical-materials-spof-cards');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-12 text-center text-slate-500 font-mono">
          <i class="fa-solid fa-circle-exclamation text-4xl mb-3 text-slate-600"></i>
          <p>No SPOF materials match current filter criteria.</p>
        </div>`;
      return;
    }

    container.innerHTML = items.map(m => `
      <div class="p-4 rounded-lg bg-slate-900 border border-rose-500/40 space-y-3 hover:border-rose-400 transition-colors cursor-pointer" onclick="openMaterialDetail('${m.id}')">
        <div class="flex items-center justify-between">
          <span class="text-base font-bold text-slate-100">${m.name}</span>
          <span class="terminal-badge px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/60 font-mono text-[10px]">
            <i class="fa-solid fa-radiation mr-1"></i> MONOPOLIZED
          </span>
        </div>

        <p class="text-xs text-rose-200/90 bg-rose-950/30 p-2.5 rounded border border-rose-800/40 line-clamp-3">${m.spof_reason}</p>

        <div class="grid grid-cols-2 gap-2 text-xs font-mono">
          <div class="p-2 rounded bg-slate-800/60 border border-slate-700">
            <div class="text-[10px] text-slate-400 uppercase">Mining Conc.</div>
            <div class="text-lg font-bold text-cyan-400">${m.mining_concentration_pct.toFixed(0)}%</div>
          </div>
          <div class="p-2 rounded bg-slate-800/60 border border-slate-700">
            <div class="text-[10px] text-slate-400 uppercase">Refining / Processing</div>
            <div class="text-lg font-bold text-purple-400">${m.processing_concentration_pct.toFixed(0)}%</div>
          </div>
        </div>

        <div class="text-xs text-slate-400 space-y-1 pt-1 border-t border-slate-800 font-mono">
          <div><span class="text-slate-500">Substitute:</span> <span class="text-slate-300">${m.substitute_available} (Friction: ${m.switching_difficulty})</span></div>
          <div><span class="text-slate-500">Qualification:</span> <span class="text-amber-400">${m.qualification_time || 'N/A'}</span></div>
          <div><span class="text-slate-500">Risk Score:</span> <span class="text-rose-400 font-bold">${m.current_risk_score.toFixed(0)} / 100</span></div>
        </div>

        <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
          <span class="text-[10px] font-mono text-slate-500">SPOF Analysis</span>
          <button onclick="event.stopPropagation(); openArticleModal('${m.id}')" class="px-2 py-1 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-mono text-[10px] font-bold border border-purple-500/40 flex items-center gap-1">
            <i class="fa-solid fa-book-open"></i> Read Shortage Dossier
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Failed to load critical materials view:", err);
  }
}

function resetCriticalMaterialsFilters() {
  const c = document.getElementById('filter-cm-country');
  if (c) c.value = 'All';
  const s = document.getElementById('filter-cm-search');
  if (s) s.value = '';
  loadCriticalMaterialsView();
}

// ==========================================
// 5. CRITICAL COMPONENTS & LEAD TIMES VIEW
// ==========================================
async function loadComponentsView() {
  const sectorFilter = document.getElementById('filter-comp-sector')?.value || 'All';
  const riskFilter = document.getElementById('filter-comp-risk')?.value || 'All';
  const search = document.getElementById('filter-comp-search')?.value.toLowerCase().trim() || '';

  try {
    const params = new URLSearchParams();
    if (sectorFilter !== 'All') params.append('sector', sectorFilter);
    if (riskFilter !== 'All') params.append('risk_level', riskFilter);
    if (search) params.append('search', search);

    const res = await fetch(`/api/components?${params.toString()}`);
    const data = await res.json();

    const badge = document.getElementById('components-count-badge');
    if (badge) {
      badge.textContent = `${data.components.length} Subsystems`;
    }

    const tbody = document.getElementById('components-table-body');
    if (!tbody) return;

    if (data.components.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-500 font-mono">No components match selected filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.components.map(c => {
      const spofBadge = c.single_point_of_failure ?
        '<span class="terminal-badge px-1.5 py-0.5 rounded bg-rose-600/30 text-rose-300 border border-rose-500/60 font-mono text-[10px]">SPOF</span>' :
        '<span class="text-slate-600 font-mono text-xs">—</span>';

      const riskBadge = c.risk_level === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                        c.risk_level === 'High' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/40';

      return `
        <tr class="hover:bg-slate-800/40 text-xs">
          <td class="font-bold text-slate-100">${c.name}</td>
          <td><span class="font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">${c.sector}</span></td>
          <td><span class="terminal-badge px-2 py-0.5 rounded ${riskBadge}">${c.risk_level} (${c.risk_score.toFixed(0)})</span></td>
          <td class="font-mono text-slate-400">${c.normal_lead_time_weeks.toFixed(0)} wks</td>
          <td class="font-mono font-bold text-amber-400">${c.current_lead_time_weeks.toFixed(0)} wks</td>
          <td class="font-mono font-bold text-rose-400">+${c.lead_time_pct_increase.toFixed(0)}%</td>
          <td>${spofBadge}</td>
          <td class="text-slate-300 truncate max-w-xs">${c.bottleneck_reason}</td>
          <td class="text-slate-400 truncate max-w-xs">${c.downstream_impact}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error("Failed to load components view:", err);
  }
}

function resetComponentsFilters() {
  const sec = document.getElementById('filter-comp-sector');
  if (sec) sec.value = 'All';
  const rk = document.getElementById('filter-comp-risk');
  if (rk) rk.value = 'All';
  const s = document.getElementById('filter-comp-search');
  if (s) s.value = '';
  loadComponentsView();
}

// ==========================================
// 6. SEMICONDUCTORS & PACKAGING ECOSYSTEM
// ==========================================
async function loadSemiconductorsView() {
  const domainFilter = document.getElementById('filter-semi-sector')?.value || 'All';
  const search = document.getElementById('filter-semi-search')?.value.toLowerCase().trim() || '';

  try {
    const res = await fetch('/api/components');
    const data = await res.json();

    // Filter components belonging to Semiconductor / Electronics / Computing domain
    let semiComponents = data.components.filter(c => 
      c.sector.includes('Computing') || 
      c.sector.includes('Semiconductors') || 
      c.sector.includes('Electronics')
    );

    if (domainFilter !== 'All') {
      semiComponents = semiComponents.filter(c => {
        if (domainFilter === 'AI Accelerators') return c.name.includes('Blackwell') || c.name.includes('MI300') || c.name.includes('Server Microprocessor');
        if (domainFilter === 'Memory') return c.name.includes('Memory') || c.name.includes('DRAM') || c.name.includes('NAND');
        if (domainFilter === 'Wafers') return c.name.includes('Wafer') || c.name.includes('Substrate');
        if (domainFilter === 'Equipment') return c.name.includes('Lithography') || c.name.includes('Etch');
        if (domainFilter === 'Chemicals') return c.name.includes('Photoresist') || c.name.includes('Chemical');
        if (domainFilter === 'Power') return c.name.includes('SiC') || c.name.includes('GaN') || c.name.includes('Sensor');
        return true;
      });
    }

    if (search) {
      semiComponents = semiComponents.filter(c => 
        c.name.toLowerCase().includes(search) || 
        c.bottleneck_reason.toLowerCase().includes(search) ||
        (c.affected_suppliers && c.affected_suppliers.join(' ').toLowerCase().includes(search))
      );
    }

    // Update Badges & KPIs
    const badge = document.getElementById('semi-count-badge');
    if (badge) badge.textContent = `${semiComponents.length} Semi Subsystems`;

    const kpiTotal = document.getElementById('semi-kpi-total');
    if (kpiTotal) kpiTotal.textContent = `${semiComponents.length} Subsystems`;

    const spofCount = semiComponents.filter(c => c.single_point_of_failure).length;
    const kpiSpof = document.getElementById('semi-kpi-spof');
    if (kpiSpof) kpiSpof.textContent = `${spofCount} Chokepoints`;

    const tbody = document.getElementById('semiconductors-table-body');
    if (tbody) {
      if (semiComponents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-500 font-mono">No semiconductor nodes match current filter.</td></tr>`;
      } else {
        tbody.innerHTML = semiComponents.map(c => {
          const spofBadge = c.single_point_of_failure ?
            '<span class="terminal-badge px-1.5 py-0.5 rounded bg-rose-600/30 text-rose-300 border border-rose-500/60 font-mono text-[10px]">SPOF</span>' :
            '<span class="text-slate-600 font-mono text-xs">—</span>';

          const riskBadge = c.risk_level === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                            c.risk_level === 'High' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                            'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40';

          const suppliersStr = Array.isArray(c.affected_suppliers) ? c.affected_suppliers.join(', ') : 'Industry Standard';

          return `
            <tr class="hover:bg-slate-800/40 text-xs">
              <td class="font-bold text-slate-100 flex items-center gap-1.5">
                <i class="fa-solid fa-microchip text-cyan-400 text-[10px]"></i>
                ${c.name}
              </td>
              <td><span class="font-mono text-slate-400">${c.sector}</span></td>
              <td><span class="terminal-badge px-2 py-0.5 rounded ${riskBadge}">${c.risk_level} (${c.risk_score.toFixed(0)})</span></td>
              <td class="font-mono text-slate-400">${c.normal_lead_time_weeks.toFixed(0)} wks</td>
              <td class="font-mono font-bold text-amber-400">${c.current_lead_time_weeks.toFixed(0)} wks</td>
              <td class="font-mono font-bold text-rose-400">+${c.lead_time_pct_increase.toFixed(0)}%</td>
              <td>${spofBadge}</td>
              <td class="font-mono text-slate-300 truncate max-w-xs">${suppliersStr}</td>
              <td class="text-slate-300 truncate max-w-xs">${c.bottleneck_reason}</td>
            </tr>
          `;
        }).join('');
      }
    }

    // Render Packaging & Architecture Value Chain Cards
    const container = document.getElementById('semiconductor-chains-container');
    if (container) {
      container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div class="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
            <h3 class="text-sm font-bold font-mono uppercase text-cyan-400 flex items-center gap-2">
              <i class="fa-solid fa-microchip"></i> AI Accelerators & Advanced Packaging (TSMC CoWoS-L / SK Hynix HBM3e)
            </h3>
            <p class="text-xs text-slate-400">NVIDIA Blackwell B200 / AMD MI300 accelerators face 36-week delivery times due to TSMC CoWoS-L 3.3x reticle size packaging allocation and SK Hynix 12-high HBM3e stack capacity commitment.</p>
            <div class="p-3 rounded bg-slate-800/60 font-mono text-xs space-y-1">
              <div class="flex justify-between"><span>Normal Lead Time:</span><span class="text-slate-300">16 weeks</span></div>
              <div class="flex justify-between"><span>Current Lead Time:</span><span class="text-amber-400 font-bold">36 weeks (+125%)</span></div>
              <div class="flex justify-between"><span>Single Source Monopoly:</span><span class="text-rose-400 font-bold">TSMC Fab 6 / AP6 (Taiwan)</span></div>
              <div class="flex justify-between"><span>Memory Choke:</span><span class="text-cyan-400 font-bold">SK Hynix 100% Pre-booked</span></div>
            </div>
          </div>

          <div class="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
            <h3 class="text-sm font-bold font-mono uppercase text-purple-400 flex items-center gap-2">
              <i class="fa-solid fa-atom"></i> High-NA 0.55 NA EUV & Immersion DUV Lithography (ASML Twinscan)
            </h3>
            <p class="text-xs text-slate-400">ASML commands 100% of extreme ultraviolet lithography scanners. Stringent export licensing and 2-year mirror grinding cycles for Carl Zeiss anamorphic optics create equipment queues exceeding 105 weeks.</p>
            <div class="p-3 rounded bg-slate-800/60 font-mono text-xs space-y-1">
              <div class="flex justify-between"><span>Normal Lead Time:</span><span class="text-slate-300">65 weeks</span></div>
              <div class="flex justify-between"><span>Current Lead Time:</span><span class="text-amber-400 font-bold">105 weeks (+61%)</span></div>
              <div class="flex justify-between"><span>Global Market Share:</span><span class="text-cyan-400 font-bold">ASML 100% EUV / >90% Immersion DUV</span></div>
              <div class="flex justify-between"><span>Crucial Precursors:</span><span class="text-slate-300 font-bold">Carl Zeiss Optics, Trumpf Lasers</span></div>
            </div>
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error("Failed to load semiconductors view:", err);
  }
}

function resetSemiconductorsFilters() {
  const d = document.getElementById('filter-semi-sector');
  if (d) d.value = 'All';
  const s = document.getElementById('filter-semi-search');
  if (s) s.value = '';
  loadSemiconductorsView();
}

// ==========================================
// 7. SUPPLY CHAINS & END-TO-END FLOWS VIEW
// ==========================================
async function loadSupplyChainsView() {
  const container = document.getElementById('supply-chains-flows-container');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- AI / Data Center Supply Chain -->
      <div class="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 class="text-sm font-bold font-mono uppercase text-cyan-400 flex items-center gap-2">
            <i class="fa-solid fa-server"></i> AI / Data Center End-to-End Value Chain
          </h3>
          <span class="terminal-badge px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono">2 Critical Bottlenecks</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-7 gap-2 text-center text-xs font-mono">
          <div class="p-2 rounded bg-slate-800/60 border border-cyan-500/40">Raw Copper & GOES Steel</div>
          <div class="p-2 rounded bg-rose-950/60 border border-rose-500/60 font-bold text-rose-300">Large Power Transformers (135w)</div>
          <div class="p-2 rounded bg-slate-800/60 border border-cyan-500/40">Silicon Wafer & Photomask</div>
          <div class="p-2 rounded bg-rose-950/60 border border-rose-500/60 font-bold text-rose-300">CoWoS Packaging & HBM3e (34w)</div>
          <div class="p-2 rounded bg-slate-800/60 border border-cyan-500/40">Optical Transceivers & PCB</div>
          <div class="p-2 rounded bg-slate-800/60 border border-cyan-500/40">Liquid Cooling Plates & Pumps</div>
          <div class="p-2 rounded bg-emerald-950/60 border border-emerald-500/60 font-bold text-emerald-300">Turnkey AI Cluster Deployed</div>
        </div>
      </div>

      <!-- Canonical Sulfur -> H-Acid Chain -->
      <div class="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 class="text-sm font-bold font-mono uppercase text-amber-400 flex items-center gap-2">
            <i class="fa-solid fa-flask"></i> Canonical Scenario: Sulfur $\\rightarrow$ H-Acid $\\rightarrow$ Textile Dyes
          </h3>
          <button onclick="openEventDetail('EVT-2025-SULF-01')" class="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 px-2.5 py-1 rounded font-mono">
            View Full Intelligence Report $\\rightarrow$
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-6 gap-2 text-center text-xs font-mono">
          <div class="p-2 rounded bg-slate-800/60 border border-slate-700">Black Sea Maritime Sanctions</div>
          <div class="p-2 rounded bg-amber-950/40 border border-amber-500/60 text-amber-300">Sulfur Supply Choke</div>
          <div class="p-2 rounded bg-slate-800/60 border border-slate-700">Oleum / Acid Plant Cuts</div>
          <div class="p-2 rounded bg-rose-950/60 border border-rose-500/60 text-rose-300 font-bold">H-Acid Spot Spike (+73%)</div>
          <div class="p-2 rounded bg-slate-800/60 border border-slate-700">Reactive Black 5 Cost Pass-Through</div>
          <div class="p-2 rounded bg-purple-950/60 border border-purple-500/60 text-purple-300 font-bold">Textile Dye House Allocations</div>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// 8. POLICY TRACKER VIEW
// ==========================================
async function loadPoliciesView() {
  try {
    const res = await fetch('/api/policies');
    const data = await res.json();

    const tbody = document.getElementById('policies-table-body');
    if (!tbody) return;

    tbody.innerHTML = data.policies.map(p => `
      <tr class="hover:bg-slate-800/40 text-xs">
        <td class="font-bold text-slate-200">${p.policy_name}</td>
        <td><span class="font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">${p.country}</span></td>
        <td><span class="terminal-badge px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">${p.policy_type}</span></td>
        <td class="font-mono text-slate-300">${p.effective_date}</td>
        <td><span class="terminal-badge px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">${p.status}</span></td>
        <td class="text-rose-400 font-mono">${p.price_impact || 'Duty added'}</td>
        <td class="text-slate-400 truncate max-w-xs">${p.supply_impact}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Failed to load policies view:", err);
  }
}

// ==========================================
// 9. GEOPOLITICAL VIEW
// ==========================================
async function loadGeopoliticalView() {
  try {
    const res = await fetch('/api/events?category=Geopolitical');
    const data = await res.json();

    const container = document.getElementById('geopolitical-events-container');
    if (!container) return;

    container.innerHTML = data.events.map(ev => `
      <div class="p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer space-y-2" onclick="openEventDetail('${ev.id}')">
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono font-bold text-rose-400 uppercase">${ev.country} | ${ev.specific_location}</span>
          <span class="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">Severity ${ev.severity.toFixed(0)}</span>
        </div>
        <h3 class="text-sm font-bold text-slate-200">${ev.title}</h3>
        <p class="text-xs text-slate-400">${ev.summary_executive}</p>
        <div class="flex items-center justify-between text-xs pt-2 border-t border-slate-800 font-mono text-slate-500">
          <span>Target Material: <span class="text-cyan-400">${ev.material_affected}</span></span>
          <span class="text-amber-400">${ev.status}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Failed to load geopolitical view:", err);
  }
}

// ==========================================
// 10. PRICE PRESSURE DETECTOR
// ==========================================
async function loadPricePressureView() {
  try {
    const [alreadyRes, buildingRes] = await Promise.all([
      fetch('/api/events?price_pressure=PRICE%20ALREADY%20RISING').then(r => r.json()),
      fetch('/api/events?price_pressure=PRICE%20PRESSURE%20BUILDING').then(r => r.json())
    ]);

    const alreadyContainer = document.getElementById('price-already-rising-list');
    const buildingContainer = document.getElementById('price-pressure-building-list');

    if (alreadyContainer) {
      alreadyContainer.innerHTML = alreadyRes.events.map(e => `
        <div class="p-3 rounded-lg bg-slate-900 border border-rose-500/30 hover:border-rose-500/60 cursor-pointer space-y-1.5" onclick="openEventDetail('${e.id}')">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-200 text-xs">${e.material_affected}</span>
            <span class="font-mono font-bold text-rose-400 text-xs">+${e.price_pct_change?.toFixed(0) || '20+'}% Surge</span>
          </div>
          <div class="text-xs text-slate-300 font-medium">${e.price_impact}</div>
          <div class="text-[11px] text-slate-500 font-mono">Source Evidence: ${e.evidence?.slice(0, 90)}...</div>
        </div>
      `).join('');
    }

    if (buildingContainer) {
      buildingContainer.innerHTML = buildingRes.events.map(e => `
        <div class="p-3 rounded-lg bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 cursor-pointer space-y-1.5" onclick="openEventDetail('${e.id}')">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-200 text-xs">${e.material_affected}</span>
            <span class="terminal-badge px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">Pressure Building</span>
          </div>
          <div class="text-xs text-slate-300">${e.title}</div>
          <div class="text-[11px] text-slate-500 font-mono">Primary Driver: ${e.primary_cause}</div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error("Failed to load price pressure view:", err);
  }
}

// ==========================================
// 11. LEAD TIMES DETECTOR
// ==========================================
async function loadLeadTimesView() {
  try {
    const res = await fetch('/api/analytics/lead_times');
    const data = await res.json();

    const tbody = document.getElementById('lead-times-table-body');
    if (!tbody) return;

    tbody.innerHTML = data.components.map(c => `
      <tr class="hover:bg-slate-800/40 text-xs">
        <td class="font-bold text-slate-200">${c.name}</td>
        <td><span class="font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">${c.sector}</span></td>
        <td class="font-mono text-slate-400">${c.normal_lead_time_weeks.toFixed(0)} wks</td>
        <td class="font-mono font-bold text-amber-400">${c.current_lead_time_weeks.toFixed(0)} wks</td>
        <td class="font-mono font-bold text-rose-400">+${c.lead_time_pct_increase.toFixed(0)}%</td>
        <td class="text-slate-300 truncate max-w-xs">${c.bottleneck_reason}</td>
        <td class="text-slate-400 truncate max-w-xs">${c.affected_suppliers?.join(', ') || 'Global Fabricators'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Failed to load lead times view:", err);
  }
}

// ==========================================
// 12. INDUSTRY IMPACT VIEW (18 Industries)
// ==========================================
async function loadIndustriesView() {
  try {
    const res = await fetch('/api/industries');
    const data = await res.json();

    const container = document.getElementById('industry-grid-container');
    if (!container) return;

    container.innerHTML = data.industries.map(ind => {
      const riskColor = ind.overall_risk_score >= 85 ? 'text-rose-400 border-rose-500/40' :
                        ind.overall_risk_score >= 75 ? 'text-amber-400 border-amber-500/40' :
                        'text-cyan-400 border-cyan-500/40';

      return `
        <div class="p-4 rounded-lg bg-slate-900 border ${riskColor} space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
              <i class="fa-solid ${ind.icon} text-cyan-400"></i> ${ind.name}
            </h3>
            <span class="text-sm font-mono font-bold ${riskColor}">Risk ${ind.overall_risk_score.toFixed(0)}</span>
          </div>

          <p class="text-xs text-slate-400 line-clamp-2">${ind.vulnerabilities_summary}</p>

          <div class="pt-2 border-t border-slate-800/80">
            <div class="text-[10px] font-mono uppercase text-slate-500 mb-1">Value Chain:</div>
            <div class="flex flex-wrap gap-1">
              ${ind.value_chain_nodes.map(n => `
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">${n}</span>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("Failed to load industries view:", err);
  }
}

// ==========================================
// 14. HISTORICAL TIMELINE VIEW
// ==========================================
async function loadHistoricalTimelineView() {
  if (typeof renderHistoricalTimelineChart === 'function') {
    renderHistoricalTimelineChart();
  }
}

function zoomTimeline(range) {
  // Update zoom button styling
  document.querySelectorAll('[data-zoom-range]').forEach(btn => {
    if (btn.getAttribute('data-zoom-range') === range) {
      btn.classList.add('bg-cyan-600', 'text-white');
      btn.classList.remove('bg-slate-800', 'text-slate-400');
    } else {
      btn.classList.remove('bg-cyan-600', 'text-white');
      btn.classList.add('bg-slate-800', 'text-slate-400');
    }
  });

  // Re-render chart with subset data
  if (typeof renderHistoricalTimelineChart === 'function') {
    if (range === '3m') {
      renderHistoricalTimelineChart({
        labels: ['Aug 26', 'Sep 26', 'Oct 26'],
        geopolitical: [5, 5, 7],
        tradePolicy: [4, 4, 6],
        manufacturing: [3, 4, 3]
      });
    } else if (range === '6m') {
      renderHistoricalTimelineChart({
        labels: ['May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26'],
        geopolitical: [3, 4, 5, 6, 5, 7],
        tradePolicy: [5, 3, 4, 5, 4, 6],
        manufacturing: [2, 4, 3, 3, 4, 3]
      });
    } else {
      renderHistoricalTimelineChart(); // full 12 months
    }
  }
}

// ==========================================
// 15. ALERTS VIEW
// ==========================================
async function loadAlertsView() {
  try {
    const [notifRes, cfgRes] = await Promise.all([
      fetch('/api/alerts/notifications').then(r => r.json()),
      fetch('/api/alerts/configs').then(r => r.json())
    ]);

    const notifContainer = document.getElementById('alerts-feed-container');
    const rulesContainer = document.getElementById('alerts-rules-container');

    if (notifContainer) {
      notifContainer.innerHTML = notifRes.notifications.map(n => `
        <div class="p-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-start gap-3">
          <i class="fa-solid fa-bell text-rose-400 mt-1"></i>
          <div class="flex-1 text-xs">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-slate-200">${n.title}</span>
              <span class="text-[10px] font-mono text-slate-500">${n.timestamp}</span>
            </div>
            <p class="text-slate-400">${n.message}</p>
          </div>
        </div>
      `).join('');
    }

    if (rulesContainer) {
      rulesContainer.innerHTML = cfgRes.configs.map(cfg => `
        <div class="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <div class="font-bold text-slate-200">${cfg.name}</div>
            <div class="text-[11px] font-mono text-slate-400">${cfg.condition_type} $\\ge$ ${cfg.threshold_value}</div>
          </div>
          <span class="terminal-badge px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">ARMED</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error("Failed to load alerts view:", err);
  }
}

async function loadNotificationsBadge() {
  try {
    const res = await fetch('/api/alerts/notifications?unread_only=true');
    const data = await res.json();
    const badge = document.getElementById('header-alert-badge');
    if (badge) {
      if (data.total > 0) {
        badge.innerText = data.total;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (err) {}
}

// ==========================================
// 16. DATA SOURCES VIEW & LIVE REFRESH
// ==========================================
async function loadDataSourcesView() {
  try {
    const res = await fetch('/api/sources');
    const data = await res.json();

    const tbody = document.getElementById('data-sources-table-body');
    if (!tbody) return;

    tbody.innerHTML = data.sources.map(s => {
      const isReq = s.status === 'DATA SOURCE REQUIRED';
      const statusBadge = isReq ?
        '<span class="terminal-badge px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">DATA SOURCE REQUIRED</span>' :
        '<span class="terminal-badge px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">CONNECTED & ACTIVE</span>';

      return `
        <tr class="hover:bg-slate-800/40 text-xs">
          <td class="font-bold text-slate-200">
            <div>${s.source_name}</div>
            <div class="text-[10px] text-slate-400 font-mono">${s.endpoint_url || 'REST Endpoint'}</div>
          </td>
          <td><span class="font-mono text-slate-300">${s.category}</span></td>
          <td>${statusBadge}</td>
          <td class="font-mono text-cyan-400">${s.items_ingested || 0}</td>
          <td class="text-slate-400">${s.data_provided}</td>
          <td class="font-mono text-slate-500">${s.last_checked || 'Pending Key Connection'}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error("Failed to load data sources view:", err);
  }
}

async function triggerLiveIngestion() {
  const btn = document.getElementById('btn-live-scan');
  if (btn) {
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Scanning Global Feeds...`;
    btn.disabled = true;
  }

  try {
    const res = await fetch('/api/sources/refresh', { method: 'POST' });
    const result = await res.json();

    // Show toast
    alert(`Live Ingestion Complete: ${result.new_events} new emerging disruptions detected, ${result.updated_events} existing events updated with corroborating sources.`);

    // Refresh command center
    await refreshCommandCenter();
    if (currentView === 'live-events') await loadLiveEventsView();
  } catch (err) {
    alert("Live scan failed: " + err.message);
  } finally {
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-satellite-dish mr-1.5 live-pulse"></i> Live Scan`;
      btn.disabled = false;
    }
  }
}

// ==========================================
// EVENT DETAIL MODAL
// ==========================================
async function openEventDetail(eventId) {
  const modal = document.getElementById('event-detail-modal');
  const content = document.getElementById('event-modal-content');
  if (!modal || !content) return;

  modal.classList.remove('hidden');
  content.innerHTML = `
    <div class="p-12 text-center text-slate-400">
      <i class="fa-solid fa-spinner fa-spin text-3xl mb-3 text-cyan-400"></i>
      <p class="font-mono text-xs">Assembling causal graph and source intelligence...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/events/${eventId}`);
    const ev = await res.json();

    content.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="terminal-badge px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">${ev.category}</span>
              <span class="text-xs font-mono text-slate-400"><i class="fa-solid fa-location-dot mr-1 text-slate-500"></i>${ev.country} (${ev.specific_location || 'Regional'})</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-slate-400">Confidence: <span class="text-emerald-400 font-bold">${ev.confidence_score.toFixed(0)}%</span></span>
              <span class="terminal-badge px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">Severity ${ev.severity.toFixed(0)}</span>
            </div>
          </div>
          <h2 class="text-lg font-bold text-slate-100">${ev.title}</h2>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-xs font-mono text-slate-400">
            <div>Event Inception Date: <span class="text-slate-200">${ev.start_date}</span></div>
            <div>First Reported Date: <span class="text-slate-200">${ev.reported_date}</span></div>
            <div>Latest Update: <span class="text-slate-200">${ev.latest_update}</span></div>
            <div>Current Status: <span class="text-amber-400 font-bold">${ev.status}</span></div>
          </div>
        </div>

        <!-- Executive Summary & Analytical Breakdown -->
        <div class="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3 text-xs">
          <h3 class="text-xs font-mono uppercase font-bold text-cyan-400 flex items-center gap-2">
            <i class="fa-solid fa-file-lines"></i> Executive Intelligence Summary
          </h3>
          <p class="text-slate-200 leading-relaxed">${ev.summary_executive}</p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <div class="text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">Why It Matters:</div>
              <div class="text-slate-300">${ev.why_it_matters || 'Directly drives supply shortages and cost inflation.'}</div>
            </div>
            <div>
              <div class="text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">What Could Happen Next:</div>
              <div class="text-slate-300">${ev.what_could_happen_next || 'Ongoing risk of escalation if feedstock flows remain restricted.'}</div>
            </div>
          </div>
        </div>

        <!-- Interactive Causal Chain Visualizer -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-mono uppercase font-bold text-slate-300 flex items-center gap-2">
              <i class="fa-solid fa-circle-nodes text-cyan-400"></i> Causal Transmission Graph
            </h3>
            <span class="text-[11px] font-mono text-slate-500">Solid = Verified | Dashed = AI Inferred</span>
          </div>
          <div id="modal-causal-container"></div>
        </div>

        <!-- 5-Phase Downstream Value Chain -->
        <div id="modal-downstream-container"></div>

        <!-- Visual Timeline -->
        <div>
          <h3 class="text-xs font-mono uppercase font-bold text-slate-300 mb-3 flex items-center gap-2">
            <i class="fa-solid fa-timeline text-purple-400"></i> Event Chronology & Escalation Milestones
          </h3>
          <div class="space-y-3 timeline-stem pl-6">
            ${ev.timeline.map(t => `
              <div class="relative">
                <div class="absolute -left-[30px] top-1.5 w-3 h-3 rounded-full bg-cyan-400 border-2 border-slate-900"></div>
                <div class="p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-xs">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-bold text-slate-200">${t.milestone_title}</span>
                    <span class="font-mono text-slate-400 text-[11px]">${t.milestone_date}</span>
                  </div>
                  <p class="text-slate-400">${t.description}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Source Verification & Hierarchy -->
        <div class="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-mono uppercase font-bold text-slate-300 flex items-center gap-2">
              <i class="fa-solid fa-shield-halved text-emerald-400"></i> Corroborating Sources (${ev.sources.length})
            </h3>
            <span class="text-xs text-slate-400 font-mono">${ev.confidence_breakdown || 'Multi-source verified.'}</span>
          </div>

          <div class="space-y-2 text-xs">
            ${ev.sources.map(s => `
              <div class="p-2.5 rounded bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="terminal-badge px-1.5 py-0.2 rounded bg-slate-700 text-cyan-300 font-mono text-[10px]">${s.source_tier}</span>
                    <span class="font-bold text-slate-200">${s.source_name}</span>
                    <span class="text-slate-500 font-mono text-[11px]">${s.publication_date}</span>
                  </div>
                  <div class="text-slate-300 italic text-[11px]">"${s.quoted_evidence}"</div>
                </div>
                ${s.url ? `
                  <a href="${s.url}" target="_blank" class="text-cyan-400 hover:text-cyan-300 text-xs font-mono shrink-0">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                  </a>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Render interactive graphs in modal
    if (typeof renderCausalChain === 'function') {
      renderCausalChain('modal-causal-container', ev.causal_links);
    }
    if (typeof renderDownstreamImpactTree === 'function') {
      renderDownstreamImpactTree(
        'modal-downstream-container',
        ev.material_affected,
        ev.commodity_affected,
        ev.component_affected,
        ev.downstream_industries,
        ['End Assembly / Delivery Lead Times']
      );
    }

  } catch (err) {
    content.innerHTML = `<div class="p-8 text-rose-400 text-xs font-mono">Error loading event details: ${err.message}</div>`;
  }
}

function closeEventModal() {
  const modal = document.getElementById('event-detail-modal');
  if (modal) modal.classList.add('hidden');
}

// ==========================================
// NATURAL LANGUAGE SMART SEARCH
// ==========================================
function executeSmartSearch(query) {
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) searchInput.value = query;

  const q = query.toLowerCase();

  // Natural language query heuristics
  if (q.includes('article') || q.includes('dossier') || q.includes('shortage') || q.includes('playbook') || q.includes('tam') || q.includes('opportunity')) {
    switchView('shortage-articles');
    const s = document.getElementById('filter-art-search');
    if (s && !q.includes('article') && !q.includes('dossier')) s.value = query;
    loadShortageArticlesView();
  } else if (q.includes('order') || q.includes('pipeline') || q.includes('surge') || q.includes('book-to-bill') || q.includes('landmark order') || q.includes('bidding')) {
    switchView('order-pipeline');
    const s = document.getElementById('filter-pipe-search');
    if (s && !q.includes('order') && !q.includes('pipeline')) s.value = query;
    loadOrderPipelineView();
  } else if (q.includes('india') || q.includes('stock') || q.includes('tril') || q.includes('nalco') || q.includes('bodal') || q.includes('polycab') || q.includes('hal') || q.includes('nano cap') || q.includes('micro cap') || q.includes('nse') || q.includes('bse')) {
    switchView('indian-stocks');
    const s = document.getElementById('filter-stock-search');
    if (s && !q.includes('india') && !q.includes('stock')) s.value = query;
    loadIndianStocksView();
  } else if (q.includes('semiconductor') && q.includes('china')) {
    switchView('live-events');
    const cat = document.getElementById('filter-category');
    if (cat) cat.value = 'Semiconductor / Electronics';
    const s = document.getElementById('filter-search');
    if (s) s.value = 'China';
    loadLiveEventsView();
  } else if (q.includes('lead time') || q.includes('lead-time')) {
    switchView('lead-times');
  } else if (q.includes('spof') || q.includes('single point') || q.includes('controls more than 60%')) {
    switchView('critical-materials');
  } else if (q.includes('sulfur') || q.includes('h-acid')) {
    openEventDetail('EVT-2025-SULF-01');
  } else if (q.includes('export restriction') || q.includes('tariff') || q.includes('policy')) {
    switchView('policy-tracker');
  } else if (q.includes('data-center') || q.includes('data center')) {
    switchView('live-events');
    const s = document.getElementById('filter-search');
    if (s) s.value = 'Data Center';
    loadLiveEventsView();
  } else {
    // Default search
    switchView('live-events');
    const s = document.getElementById('filter-search');
    if (s) s.value = query;
    loadLiveEventsView();
  }
}

// ==========================================
// TRANSPARENT RISK WEIGHT CONFIG MODAL
// ==========================================
async function openRiskWeightsModal() {
  const modal = document.getElementById('risk-weights-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  try {
    const weights = await fetch('/api/analytics/risk_weights').then(r => r.json());
    currentRiskWeights = weights;

    document.getElementById('weight-concentration').value = Math.round(weights.supply_concentration * 100);
    document.getElementById('weight-val-concentration').innerText = `${Math.round(weights.supply_concentration * 100)}%`;

    document.getElementById('weight-severity').value = Math.round(weights.severity_of_disruption * 100);
    document.getElementById('weight-val-severity').innerText = `${Math.round(weights.severity_of_disruption * 100)}%`;

    document.getElementById('weight-price').value = Math.round(weights.price_movement * 100);
    document.getElementById('weight-val-price').innerText = `${Math.round(weights.price_movement * 100)}%`;

    document.getElementById('weight-leadtime').value = Math.round(weights.lead_time_increase * 100);
    document.getElementById('weight-val-leadtime').innerText = `${Math.round(weights.lead_time_increase * 100)}%`;

    document.getElementById('weight-geopolitics').value = Math.round(weights.geopolitical_risk * 100);
    document.getElementById('weight-val-geopolitics').innerText = `${Math.round(weights.geopolitical_risk * 100)}%`;

    document.getElementById('weight-substitutability').value = Math.round(weights.substitutability * 100);
    document.getElementById('weight-val-substitutability').innerText = `${Math.round(weights.substitutability * 100)}%`;

    document.getElementById('weight-duration').value = Math.round(weights.duration * 100);
    document.getElementById('weight-val-duration').innerText = `${Math.round(weights.duration * 100)}%`;

    document.getElementById('weight-downstream').value = Math.round(weights.downstream_criticality * 100);
    document.getElementById('weight-val-downstream').innerText = `${Math.round(weights.downstream_criticality * 100)}%`;
  } catch (err) {
    console.error("Failed to load risk weights:", err);
  }
}

function closeRiskWeightsModal() {
  const modal = document.getElementById('risk-weights-modal');
  if (modal) modal.classList.add('hidden');
}

async function saveRiskWeights() {
  const payload = {
    supply_concentration: parseInt(document.getElementById('weight-concentration').value) / 100,
    severity_of_disruption: parseInt(document.getElementById('weight-severity').value) / 100,
    price_movement: parseInt(document.getElementById('weight-price').value) / 100,
    lead_time_increase: parseInt(document.getElementById('weight-leadtime').value) / 100,
    geopolitical_risk: parseInt(document.getElementById('weight-geopolitics').value) / 100,
    substitutability: parseInt(document.getElementById('weight-substitutability').value) / 100,
    duration: parseInt(document.getElementById('weight-duration').value) / 100,
    downstream_criticality: parseInt(document.getElementById('weight-downstream').value) / 100
  };

  try {
    await fetch('/api/analytics/risk_weights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    closeRiskWeightsModal();
    alert("Risk scoring formula updated successfully across all intelligence models.");
    refreshCommandCenter();
  } catch (err) {
    alert("Failed to update weights: " + err.message);
  }
}

// ==========================================
// THEME TOGGLE
// ==========================================
function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.innerHTML = isLight ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
  }
}

// ==========================================
// 17. INDIAN STOCKS IMPACT RADAR
// ==========================================
async function loadIndianStocksView() {
  const mcapFilter = document.getElementById('filter-stock-mcap')?.value || 'All';
  const dirFilter = document.getElementById('filter-stock-direction')?.value || 'All';
  const natureFilter = document.getElementById('filter-stock-nature')?.value || 'All';
  const sectorFilter = document.getElementById('filter-stock-sector')?.value || 'All';
  const matFilter = document.getElementById('filter-stock-material')?.value || 'All';
  const searchFilter = document.getElementById('filter-stock-search')?.value || '';

  const params = new URLSearchParams();
  if (mcapFilter !== 'All') params.append('market_cap_tier', mcapFilter);
  if (dirFilter !== 'All') params.append('impact_direction', dirFilter);
  if (natureFilter !== 'All') params.append('impact_nature', natureFilter);
  if (sectorFilter !== 'All') params.append('sector', sectorFilter);
  if (matFilter !== 'All') params.append('material', matFilter);
  if (searchFilter) params.append('search', searchFilter);

  try {
    const res = await fetch(`/api/indian-stocks?${params.toString()}`);
    const data = await res.json();

    // Update KPI summary cards
    if (data.statistics) {
      const kpiTotal = document.getElementById('indian-kpi-total');
      const kpiDirect = document.getElementById('indian-kpi-direct');
      const kpiNeg = document.getElementById('indian-kpi-negative');
      const kpiPos = document.getElementById('indian-kpi-positive');

      if (kpiTotal) kpiTotal.innerText = data.statistics.total_tracked;
      if (kpiDirect) kpiDirect.innerText = data.statistics.direct_impact_count;
      if (kpiNeg) kpiNeg.innerText = data.statistics.negative_impact_count;
      if (kpiPos) kpiPos.innerText = data.statistics.positive_impact_count;
    }

    const tbody = document.getElementById('indian-stocks-table-body');
    if (!tbody) return;

    if (data.stocks.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="p-8 text-center text-slate-500 font-mono">
            <i class="fa-solid fa-filter-circle-xmark text-3xl mb-2 text-slate-600 block"></i>
            No Indian listed companies match the selected filter parameters.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = data.stocks.map(s => {
      // Tier badge color
      const tierColor = s.market_cap_tier === 'Large Cap' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                        s.market_cap_tier === 'Mid Cap' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                        s.market_cap_tier === 'Small Cap' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                        s.market_cap_tier === 'Micro Cap' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-orange-500/20 text-orange-300 border border-orange-500/40';

      // Impact Direction
      const isPositive = s.impact_direction === 'POSITIVE';
      const dirBadge = isPositive ?
        `<span class="terminal-badge px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 w-fit">
          <i class="fa-solid fa-arrow-trend-up text-emerald-400"></i> POSITIVE (+${s.ebitda_margin_risk_pct}%)
        </span>` :
        `<span class="terminal-badge px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 w-fit">
          <i class="fa-solid fa-arrow-trend-down text-rose-400"></i> NEGATIVE (${s.ebitda_margin_risk_pct}%)
        </span>`;

      // Directness badge - HIGHLIGHT DIRECT IMPACT CLEARLY!
      const isDirect = s.impact_nature === 'DIRECT';
      const natureBadge = isDirect ?
        `<span class="terminal-badge px-2 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-500/60 font-bold flex items-center gap-1 w-fit">
          <i class="fa-solid fa-triangle-exclamation text-amber-400 animate-pulse"></i> DIRECT IMPACT
        </span>` :
        `<span class="terminal-badge px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 w-fit">
          INDIRECT
        </span>`;

      // Pass-through power badge
      const ptClass = s.pricing_power_passthrough === 'High' ? 'text-emerald-400' :
                      s.pricing_power_passthrough === 'Moderate' ? 'text-amber-400' :
                      'text-rose-400 font-bold';

      const leadClass = s.lead_time_sensitivity === 'Critical' ? 'text-rose-400 font-bold' :
                        s.lead_time_sensitivity === 'High' ? 'text-amber-400' : 'text-slate-300';

      const mcapFormatted = s.market_cap_inr_cr >= 1000 ?
        `₹${(s.market_cap_inr_cr / 1000).toFixed(1)}k Cr` :
        `₹${s.market_cap_inr_cr.toFixed(0)} Cr`;

      return `
        <tr class="hover:bg-slate-800/40 cursor-pointer text-xs" onclick="openIndianStockDetail('${s.id}')">
          <!-- Ticker & Company -->
          <td>
            <div class="flex items-center gap-1.5">
              <span class="font-mono font-bold text-slate-100">${s.ticker}</span>
              <span class="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-cyan-400 border border-slate-700">${s.exchange}</span>
            </div>
            <div class="text-[11px] text-slate-300 font-medium truncate max-w-[180px]">${s.company_name}</div>
          </td>

          <!-- Market Cap Tier -->
          <td>
            <span class="terminal-badge px-1.5 py-0.5 rounded ${tierColor}">${s.market_cap_tier}</span>
            <div class="text-[11px] text-slate-400 font-mono mt-0.5">${mcapFormatted}</div>
          </td>

          <!-- Directness (Highlighted) -->
          <td>${natureBadge}</td>

          <!-- Impact & Margin Delta -->
          <td>
            ${dirBadge}
          </td>

          <!-- Trigger Materials -->
          <td>
            <div class="flex flex-wrap gap-1 max-w-xs">
              ${s.primary_materials_exposed.map(m => `
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-300">${m}</span>
              `).join('')}
            </div>
          </td>

          <!-- Lead-Time Sensitivity -->
          <td>
            <span class="font-mono ${leadClass}">${s.lead_time_sensitivity}</span>
          </td>

          <!-- Pricing Power -->
          <td>
            <span class="font-mono ${ptClass}">${s.pricing_power_passthrough}</span>
          </td>

          <!-- Transmission Mechanism -->
          <td>
            <div class="text-[11px] text-slate-300 line-clamp-2 max-w-xs" title="${s.transmission_mechanism}">
              ${s.transmission_mechanism}
            </div>
          </td>

          <!-- Action -->
          <td class="text-right">
            <button class="px-2.5 py-1 rounded bg-slate-800 hover:bg-orange-600 hover:text-white text-orange-300 font-mono text-[11px] border border-orange-500/30 transition-colors">
              Inspect $\\rightarrow$
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error("Failed to load Indian stocks view:", err);
  }
}

function resetIndianStockFilters() {
  const mcap = document.getElementById('filter-stock-mcap');
  const dir = document.getElementById('filter-stock-direction');
  const nature = document.getElementById('filter-stock-nature');
  const sector = document.getElementById('filter-stock-sector');
  const mat = document.getElementById('filter-stock-material');
  const search = document.getElementById('filter-stock-search');

  if (mcap) mcap.value = 'All';
  if (dir) dir.value = 'All';
  if (nature) nature.value = 'All';
  if (sector) sector.value = 'All';
  if (mat) mat.value = 'All';
  if (search) search.value = '';

  loadIndianStocksView();
}

async function openIndianStockDetail(stockId) {
  const modal = document.getElementById('indian-stock-detail-modal');
  const content = document.getElementById('indian-stock-modal-content');
  if (!modal || !content) return;

  modal.classList.remove('hidden');
  content.innerHTML = `
    <div class="p-12 text-center text-slate-400">
      <i class="fa-solid fa-spinner fa-spin text-3xl mb-3 text-orange-400"></i>
      <p class="font-mono text-xs">Querying supply-chain transmission model for Indian equity...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/indian-stocks/${stockId}`);
    const s = await res.json();

    const isPositive = s.impact_direction === 'POSITIVE';
    const bannerBorder = isPositive ? 'border-emerald-500/60 bg-emerald-950/20' : 'border-rose-500/60 bg-rose-950/20';
    const bannerTitle = isPositive ? 'POSITIVE BENEFICIARY OF SUPPLY FRICTION' : 'NEGATIVE INPUT INFLATION & LEAD-TIME SQUEEZE';
    const bannerColor = isPositive ? 'text-emerald-400' : 'text-rose-400';

    const mcapFormatted = s.market_cap_inr_cr >= 1000 ?
      `₹${(s.market_cap_inr_cr / 1000).toFixed(1)}k Cr` :
      `₹${s.market_cap_inr_cr.toFixed(0)} Cr`;

    content.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-sm font-bold font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">${s.ticker} (${s.exchange})</span>
              <span class="terminal-badge px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">${s.market_cap_tier}</span>
              <span class="text-xs font-mono text-cyan-400">${s.sector} $\\rightarrow$ ${s.industry}</span>
            </div>
            <h2 class="text-xl font-bold text-slate-100">${s.company_name}</h2>
          </div>

          <div class="text-right">
            <div class="text-xs text-slate-400 uppercase font-mono">Market Cap</div>
            <div class="text-lg font-bold font-mono text-slate-100">${mcapFormatted}</div>
          </div>
        </div>

        <!-- Impact Direction & Directness Banner -->
        <div class="p-4 rounded-lg border ${bannerBorder} space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-base ${bannerColor}"><i class="fa-solid ${isPositive ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i></span>
              <span class="text-sm font-bold font-mono uppercase ${bannerColor}">${bannerTitle}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="terminal-badge px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-500/60 font-bold">
                ${s.impact_nature} IMPACT
              </span>
              <span class="font-mono font-bold text-sm ${bannerColor}">
                EBITDA Delta: ${s.ebitda_margin_risk_pct > 0 ? '+' : ''}${s.ebitda_margin_risk_pct}%
              </span>
            </div>
          </div>
          <p class="text-xs text-slate-300 font-sans leading-relaxed">${s.impact_summary}</p>
        </div>

        <!-- Transmission Mechanism & COGS Exposure -->
        <div class="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
          <h3 class="text-xs font-mono uppercase font-bold text-cyan-400 flex items-center gap-2">
            <i class="fa-solid fa-diagram-project"></i> Supply-Chain Transmission Mechanism
          </h3>
          <p class="text-xs text-slate-200 leading-relaxed font-sans">${s.transmission_mechanism}</p>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
            <div class="p-2 rounded bg-slate-800/60">
              <span class="text-[10px] text-slate-400 uppercase block">COGS Raw Material Exposure</span>
              <span class="text-base font-bold text-slate-100">${s.cogs_exposure_pct}% of Revenue</span>
            </div>
            <div class="p-2 rounded bg-slate-800/60">
              <span class="text-[10px] text-slate-400 uppercase block">Pricing Power / Pass-Through</span>
              <span class="text-base font-bold ${s.pricing_power_passthrough === 'High' ? 'text-emerald-400' : s.pricing_power_passthrough === 'Moderate' ? 'text-amber-400' : 'text-rose-400'}">${s.pricing_power_passthrough}</span>
            </div>
            <div class="p-2 rounded bg-slate-800/60">
              <span class="text-[10px] text-slate-400 uppercase block">Lead-Time Sensitivity</span>
              <span class="text-base font-bold ${s.lead_time_sensitivity === 'Critical' ? 'text-rose-400' : 'text-amber-400'}">${s.lead_time_sensitivity}</span>
            </div>
            <div class="p-2 rounded bg-slate-800/60">
              <span class="text-[10px] text-slate-400 uppercase block">Price Rise Sensitivity</span>
              <span class="text-base font-bold ${s.price_rise_sensitivity === 'Critical' ? 'text-rose-400' : 'text-amber-400'}">${s.price_rise_sensitivity}</span>
            </div>
          </div>
        </div>

        <!-- Analytical Thesis / Mitigating Factors -->
        <div class="p-4 rounded-lg bg-slate-900/40 border border-slate-800 text-xs space-y-1.5">
          <div class="text-[11px] font-mono uppercase font-bold text-slate-400">
            <i class="fa-solid fa-lightbulb text-amber-400 mr-1"></i> Strategic / Beneficiary Thesis &amp; Mitigating Factors:
          </div>
          <p class="text-slate-300 font-sans">${s.beneficiary_thesis}</p>
        </div>

        <!-- Key Products at Risk -->
        <div>
          <div class="text-xs font-mono uppercase font-bold text-slate-400 mb-2">Key Products &amp; Lines Exposed:</div>
          <div class="flex flex-wrap gap-1.5">
            ${s.key_products_at_risk.map(p => `
              <span class="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700">
                <i class="fa-solid fa-box text-cyan-400 mr-1"></i> ${p}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Correlated Global Events -->
        ${s.linked_events && s.linked_events.length ? `
          <div class="space-y-2 pt-2 border-t border-slate-800">
            <div class="text-xs font-mono uppercase font-bold text-slate-400">
              <i class="fa-solid fa-link text-cyan-400 mr-1"></i> Correlated Global Disruption Events (${s.linked_events.length}):
            </div>
            <div class="space-y-2">
              ${s.linked_events.map(ev => `
                <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs flex items-center justify-between" onclick="closeIndianStockModal(); openEventDetail('${ev.id}')">
                  <div>
                    <span class="font-bold text-slate-200">${ev.title}</span>
                    <div class="text-[11px] text-slate-400 font-mono mt-0.5">
                      Price Impact: <span class="text-rose-400">${ev.price_impact || 'Surge'}</span> | Lead Time: <span class="text-amber-400">${ev.lead_time_impact || 'Stretch'}</span>
                    </div>
                  </div>
                  <span class="terminal-badge px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0 ml-3">
                    Sev ${ev.severity.toFixed(0)}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

  } catch (err) {
    content.innerHTML = `<div class="p-8 text-rose-400 text-xs font-mono">Error loading stock detail: ${err.message}</div>`;
  }
}

function closeIndianStockModal() {
  const modal = document.getElementById('indian-stock-detail-modal');
  if (modal) modal.classList.add('hidden');
}

// ==========================================
// 18. ORDER PIPELINE & LANDMARK ORDERS TRACKER
// ==========================================
let currentOrderPipelineTab = 'companies';
let orderPipelineSearchTimer = null;

function switchOrderPipelineTab(tab) {
  currentOrderPipelineTab = tab;
  const btnCompanies = document.getElementById('btn-tab-companies');
  const btnOrders = document.getElementById('btn-tab-orders');
  const containerCompanies = document.getElementById('tab-container-companies');
  const containerOrders = document.getElementById('tab-container-orders');

  if (tab === 'companies') {
    if (btnCompanies) {
      btnCompanies.className = 'px-3 py-1 rounded bg-emerald-700 text-white font-semibold';
    }
    if (btnOrders) {
      btnOrders.className = 'px-3 py-1 rounded text-slate-400 hover:text-slate-200';
    }
    if (containerCompanies) containerCompanies.classList.remove('hidden');
    if (containerOrders) containerOrders.classList.add('hidden');
    loadOrderPipelineView();
  } else {
    if (btnCompanies) {
      btnCompanies.className = 'px-3 py-1 rounded text-slate-400 hover:text-slate-200';
    }
    if (btnOrders) {
      btnOrders.className = 'px-3 py-1 rounded bg-emerald-700 text-white font-semibold';
    }
    if (containerCompanies) containerCompanies.classList.add('hidden');
    if (containerOrders) containerOrders.classList.remove('hidden');
    loadSignificantOrdersFeed();
  }
}

function debounceOrderPipelineSearch() {
  clearTimeout(orderPipelineSearchTimer);
  orderPipelineSearchTimer = setTimeout(() => {
    if (currentOrderPipelineTab === 'companies') {
      loadOrderPipelineView();
    } else {
      loadSignificantOrdersFeed();
    }
  }, 250);
}

function resetOrderPipelineFilters() {
  const mcap = document.getElementById('filter-pipe-mcap');
  const sector = document.getElementById('filter-pipe-sector');
  const surge = document.getElementById('filter-pipe-surge');
  const risk = document.getElementById('filter-pipe-risk');
  const sort = document.getElementById('filter-pipe-sort');
  const search = document.getElementById('filter-pipe-search');

  if (mcap) mcap.value = 'All';
  if (sector) sector.value = 'All';
  if (surge) surge.value = '0';
  if (risk) risk.value = 'All';
  if (sort) sort.value = 'surge_multiplier_desc';
  if (search) search.value = '';

  if (currentOrderPipelineTab === 'companies') {
    loadOrderPipelineView();
  } else {
    loadSignificantOrdersFeed();
  }
}

async function loadOrderPipelineView() {
  const mcap = document.getElementById('filter-pipe-mcap')?.value || 'All';
  const sector = document.getElementById('filter-pipe-sector')?.value || 'All';
  const minSurge = document.getElementById('filter-pipe-surge')?.value || '0';
  const risk = document.getElementById('filter-pipe-risk')?.value || 'All';
  const sortBy = document.getElementById('filter-pipe-sort')?.value || 'surge_multiplier_desc';
  const search = document.getElementById('filter-pipe-search')?.value || '';

  const params = new URLSearchParams();
  if (mcap !== 'All') params.append('market_cap_tier', mcap);
  if (sector !== 'All') params.append('sector', sector);
  if (parseFloat(minSurge) > 0) params.append('min_surge', minSurge);
  if (risk !== 'All') params.append('execution_risk', risk);
  if (sortBy) params.append('sort_by', sortBy);
  if (search) params.append('search', search);

  const tbody = document.getElementById('order-pipeline-table-body');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-500 font-mono text-xs">Loading order pipeline records...</td></tr>`;
  }

  try {
    const res = await fetch(`/api/order-pipeline?${params.toString()}`);
    const data = await res.json();

    // Populate Top-level KPI cards
    if (data.statistics) {
      const stats = data.statistics;
      const elTotalPipe = document.getElementById('pipe-kpi-total-pipeline');
      const elOrderBook = document.getElementById('pipe-kpi-order-book');
      const elBidding = document.getElementById('pipe-kpi-bidding');
      const elRecentInflows = document.getElementById('pipe-kpi-recent-inflows');
      const elOrdersCount = document.getElementById('pipe-kpi-orders-count');
      const elAvgSurge = document.getElementById('pipe-kpi-avg-surge');
      const elHighVis = document.getElementById('pipe-kpi-high-visibility');
      const elChoke = document.getElementById('pipe-kpi-choke-count');

      if (elTotalPipe) elTotalPipe.innerText = `₹${(stats.total_combined_pipeline_cr).toLocaleString('en-IN')} Cr`;
      if (elOrderBook) elOrderBook.innerText = `₹${(stats.cumulative_order_book_cr).toLocaleString('en-IN')} Cr`;
      if (elBidding) elBidding.innerText = `₹${(stats.cumulative_bidding_pipeline_cr).toLocaleString('en-IN')} Cr`;
      if (elRecentInflows) elRecentInflows.innerText = `₹${(stats.recent_inflows_total_cr).toLocaleString('en-IN')} Cr`;
      if (elOrdersCount) elOrdersCount.innerText = stats.landmark_orders_count;
      if (elAvgSurge) elAvgSurge.innerText = `${stats.avg_surge_multiplier}x`;
      if (elHighVis) elHighVis.innerText = `${stats.high_visibility_companies} Firms`;
      if (elChoke) elChoke.innerText = `${stats.critical_choke_count} Bottlenecks`;
    }

    if (!tbody) return;

    if (!data.companies || data.companies.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-500 font-mono text-xs">No companies match the selected order book filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.companies.map(c => {
      // Tier Badge Colors
      let tierBadge = 'bg-slate-800 text-slate-300 border-slate-700';
      if (c.market_cap_tier === 'Large Cap') tierBadge = 'bg-blue-900/40 text-blue-300 border-blue-600/40';
      else if (c.market_cap_tier === 'Mid Cap') tierBadge = 'bg-purple-900/40 text-purple-300 border-purple-600/40';
      else if (c.market_cap_tier === 'Small Cap') tierBadge = 'bg-amber-900/40 text-amber-300 border-amber-600/40';
      else if (c.market_cap_tier === 'Micro Cap') tierBadge = 'bg-emerald-900/40 text-emerald-300 border-emerald-600/40';
      else if (c.market_cap_tier === 'Nano Cap') tierBadge = 'bg-rose-900/40 text-rose-300 border-rose-600/40';

      // Book to bill styling
      let b2bBadge = 'bg-slate-800/80 text-slate-300 border-slate-700';
      if (c.book_to_bill_ratio >= 4.0) b2bBadge = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 font-bold';
      else if (c.book_to_bill_ratio >= 2.0) b2bBadge = 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50';
      else if (c.book_to_bill_ratio >= 1.0) b2bBadge = 'bg-blue-950/80 text-blue-300 border-blue-500/40';

      // Surge multiplier badge
      let surgeBadge = 'bg-slate-800 text-slate-300 border-slate-700';
      if (c.surge_multiplier >= 7.0) surgeBadge = 'bg-rose-950/90 text-rose-300 border-rose-500/60 font-bold animate-pulse';
      else if (c.surge_multiplier >= 5.5) surgeBadge = 'bg-amber-950/90 text-amber-300 border-amber-500/50 font-bold';
      else if (c.surge_multiplier >= 4.0) surgeBadge = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';

      // Risk badge
      let riskBadge = 'bg-slate-800 text-slate-400 border-slate-700';
      if (c.execution_risk_level === 'Critical') riskBadge = 'bg-rose-950/90 text-rose-300 border-rose-600/60';
      else if (c.execution_risk_level === 'High') riskBadge = 'bg-amber-950/90 text-amber-300 border-amber-600/50';
      else if (c.execution_risk_level === 'Moderate') riskBadge = 'bg-blue-950/80 text-blue-300 border-blue-500/40';
      else if (c.execution_risk_level === 'Low') riskBadge = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';

      // Material lead time indicator
      let leadBadge = 'text-slate-400';
      if (c.material_lead_time_weeks >= 55) leadBadge = 'text-rose-400 font-bold';
      else if (c.material_lead_time_weeks >= 40) leadBadge = 'text-amber-400 font-bold';

      return `
        <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800/60">
          <!-- Ticker & Company -->
          <td class="py-2.5">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-100 font-mono text-sm">${c.ticker}</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded border font-mono ${tierBadge}">${c.market_cap_tier}</span>
            </div>
            <div class="text-[11px] text-slate-400 truncate max-w-[180px]" title="${c.company_name}">${c.company_name}</div>
          </td>

          <!-- Cap Tier & Sector -->
          <td class="py-2.5">
            <div class="text-xs text-slate-200 font-mono font-medium">${c.sector}</div>
            <div class="text-[11px] text-slate-400 truncate max-w-[150px]">${c.industry}</div>
          </td>

          <!-- Executable Order Book -->
          <td class="text-right py-2.5 font-mono">
            <div class="text-xs font-bold text-emerald-400">₹${c.total_order_book_cr.toLocaleString('en-IN')} Cr</div>
            <div class="text-[10px] text-slate-500 font-mono">${c.delivery_timeline_months} mo execution</div>
          </td>

          <!-- TTM Revenue -->
          <td class="text-right py-2.5 font-mono">
            <div class="text-xs text-slate-300">₹${c.ttm_revenue_cr.toLocaleString('en-IN')} Cr</div>
            <div class="text-[10px] text-slate-500 font-mono">₹${c.market_cap_inr_cr.toLocaleString('en-IN')} Cr mcap</div>
          </td>

          <!-- Book-to-Bill Ratio -->
          <td class="text-center py-2.5">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono ${b2bBadge}">
              <i class="fa-solid fa-shield-check text-[10px]"></i> ${c.book_to_bill_ratio.toFixed(2)}x
            </span>
          </td>

          <!-- Hist. vs Landmark Avg -->
          <td class="text-right py-2.5 font-mono text-xs">
            <div class="text-slate-400 text-[11px]">Hist: ₹${c.historical_avg_order_size_cr.toFixed(1)} Cr</div>
            <div class="text-emerald-300 font-semibold">New: ₹${c.recent_avg_order_size_cr.toFixed(1)} Cr</div>
          </td>

          <!-- Surge Multiplier -->
          <td class="text-center py-2.5">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-mono ${surgeBadge}">
              <span>🔥</span> ${c.surge_multiplier.toFixed(2)}x
            </span>
          </td>

          <!-- Total Pipeline (Book + Bidding) -->
          <td class="text-right py-2.5 font-mono">
            <div class="text-xs font-bold text-cyan-300">₹${c.total_pipeline_cr.toLocaleString('en-IN')} Cr</div>
            <div class="text-[10px] text-slate-500 font-mono">+₹${c.bidding_pipeline_cr.toLocaleString('en-IN')} Cr bids</div>
          </td>

          <!-- Bottleneck & Lead Time -->
          <td class="py-2.5 max-w-[220px]">
            <div class="text-[11px] text-slate-300 truncate" title="${c.primary_material_bottleneck}">
              ${c.primary_material_bottleneck}
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] font-mono ${leadBadge}">
                <i class="fa-solid fa-hourglass-half"></i> ${c.material_lead_time_weeks} wks
              </span>
              <span class="text-[9px] px-1 py-0.2 rounded border font-mono ${riskBadge}">${c.execution_risk_level} Risk</span>
            </div>
          </td>

          <!-- Action -->
          <td class="text-right py-2.5">
            <button onclick="openCompanyOrderModal('${c.id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-mono text-xs border border-emerald-500/30 transition-colors flex items-center gap-1.5 ml-auto">
              <span>Inspect</span>
              <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded">${c.landmark_orders_count}</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading order pipeline:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-rose-400 font-mono text-xs">Failed to load order pipeline: ${err.message}</td></tr>`;
    }
  }
}

async function loadSignificantOrdersFeed() {
  const search = document.getElementById('filter-pipe-search')?.value || '';
  const params = new URLSearchParams();
  if (search) params.append('search', search);

  const tbody = document.getElementById('significant-orders-table-body');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-500 font-mono text-xs">Loading landmark orders feed...</td></tr>`;
  }

  try {
    const res = await fetch(`/api/order-pipeline/orders?${params.toString()}`);
    const data = await res.json();

    if (!tbody) return;

    if (!data.orders || data.orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-500 font-mono text-xs">No landmark orders found matching criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.orders.map(o => {
      // Order tag badge
      let tagBadge = 'bg-slate-800 text-slate-300 border-slate-700';
      if (o.order_significance_tag === 'Highest Ever Single Order') tagBadge = 'bg-rose-950 text-rose-300 border-rose-500/60 font-bold';
      else if (o.order_significance_tag === 'Landmark Mega Order') tagBadge = 'bg-amber-950 text-amber-300 border-amber-500/60 font-bold';
      else if (o.order_significance_tag === 'Export Breakthrough') tagBadge = 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-bold';
      else if (o.order_significance_tag === 'Multi-Year Framework Contract') tagBadge = 'bg-purple-950 text-purple-300 border-purple-500/60 font-bold';
      else if (o.order_significance_tag === 'New High-Margin Segment') tagBadge = 'bg-emerald-950 text-emerald-300 border-emerald-500/60 font-bold';

      // Client category badge
      let catBadge = 'bg-slate-800 text-slate-400';
      if (o.client_category === 'Defence & Strategic') catBadge = 'bg-red-900/40 text-red-300 border border-red-500/40';
      else if (o.client_category === 'Domestic PSU') catBadge = 'bg-blue-900/40 text-blue-300 border border-blue-500/40';
      else if (o.client_category === 'Domestic Private') catBadge = 'bg-slate-800 text-slate-300 border border-slate-700';
      else if (o.client_category === 'Export / Global OEM') catBadge = 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/40';

      return `
        <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800/60">
          <!-- Date & Tag -->
          <td class="py-2.5">
            <div class="text-[10px] text-slate-400 font-mono">${o.announcement_date}</div>
            <span class="inline-block px-1.5 py-0.2 rounded border text-[9px] font-mono mt-0.5 ${tagBadge}">
              ${o.order_significance_tag}
            </span>
          </td>

          <!-- Company -->
          <td class="py-2.5">
            <button onclick="openCompanyOrderModal('${o.company_id}')" class="font-bold text-slate-100 font-mono text-xs hover:text-emerald-400 text-left">
              ${o.ticker}
            </button>
            <div class="text-[11px] text-slate-400 truncate max-w-[140px]">${o.company_name}</div>
          </td>

          <!-- Client & Category -->
          <td class="py-2.5">
            <div class="text-xs text-slate-200 font-mono font-medium truncate max-w-[200px]" title="${o.client_name}">
              ${o.client_name}
            </div>
            <span class="inline-block text-[9px] px-1 py-0.2 rounded font-mono mt-0.5 ${catBadge}">
              ${o.client_category}
            </span>
          </td>

          <!-- Order Value -->
          <td class="text-right py-2.5 font-mono">
            <div class="text-sm font-bold text-emerald-400">₹${o.order_value_cr.toLocaleString('en-IN')} Cr</div>
          </td>

          <!-- % of Annual Revenue -->
          <td class="text-right py-2.5 font-mono">
            <span class="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
              ${o.pct_of_annual_revenue.toFixed(1)}% TTM
            </span>
          </td>

          <!-- Surge Factor -->
          <td class="text-center py-2.5 font-mono">
            <span class="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 text-xs font-bold">
              ${o.surge_factor.toFixed(1)}x
            </span>
            <div class="text-[9px] text-slate-500 mt-0.5">vs hist ₹${o.historical_avg_benchmark_cr.toFixed(0)} Cr</div>
          </td>

          <!-- Scope of Work & Delivery -->
          <td class="py-2.5 max-w-[280px]">
            <div class="text-xs text-slate-300 line-clamp-2" title="${o.scope_of_work}">
              ${o.scope_of_work}
            </div>
            <div class="text-[10px] text-slate-500 font-mono mt-0.5">
              <i class="fa-regular fa-clock"></i> Execution: <span class="text-slate-300">${o.execution_period_months} months</span>
            </div>
          </td>

          <!-- Critical Material & Bottleneck Note -->
          <td class="py-2.5 max-w-[240px]">
            <div class="text-[11px] text-slate-300 font-mono truncate" title="${o.critical_raw_materials}">
              <i class="fa-solid fa-cube text-slate-500 text-[10px]"></i> ${o.critical_raw_materials}
            </div>
            <div class="text-[10px] text-amber-300/90 truncate mt-0.5" title="${o.bottleneck_impact_note}">
              ${o.bottleneck_impact_note}
            </div>
          </td>

          <!-- Status -->
          <td class="text-center py-2.5">
            <span class="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
              ${o.status}
            </span>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading landmark orders:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-rose-400 font-mono text-xs">Failed to load landmark orders: ${err.message}</td></tr>`;
    }
  }
}

async function openCompanyOrderModal(companyId) {
  const modal = document.getElementById('order-pipeline-company-modal');
  const content = document.getElementById('order-company-modal-content');
  if (!modal || !content) return;

  modal.classList.remove('hidden');
  content.innerHTML = `
    <div class="flex items-center justify-center p-12 text-slate-400 font-mono text-xs">
      <i class="fa-solid fa-arrows-rotate animate-spin mr-2"></i> Loading company dossier...
    </div>
  `;

  try {
    const res = await fetch(`/api/order-pipeline/company/${companyId}`);
    if (!res.ok) throw new Error('Company not found');
    const c = await res.json();

    // Cap Tier badge
    let tierBadge = 'bg-slate-800 text-slate-300 border-slate-700';
    if (c.market_cap_tier === 'Large Cap') tierBadge = 'bg-blue-900/40 text-blue-300 border-blue-600/40';
    else if (c.market_cap_tier === 'Mid Cap') tierBadge = 'bg-purple-900/40 text-purple-300 border-purple-600/40';
    else if (c.market_cap_tier === 'Small Cap') tierBadge = 'bg-amber-900/40 text-amber-300 border-amber-600/40';
    else if (c.market_cap_tier === 'Micro Cap') tierBadge = 'bg-emerald-900/40 text-emerald-300 border-emerald-600/40';
    else if (c.market_cap_tier === 'Nano Cap') tierBadge = 'bg-rose-900/40 text-rose-300 border-rose-600/40';

    // Risk badge
    let riskBadge = 'bg-slate-800 text-slate-400 border-slate-700';
    if (c.execution_risk_level === 'Critical') riskBadge = 'bg-rose-950 text-rose-300 border-rose-600/60';
    else if (c.execution_risk_level === 'High') riskBadge = 'bg-amber-950 text-amber-300 border-amber-600/50';
    else if (c.execution_risk_level === 'Moderate') riskBadge = 'bg-blue-950 text-blue-300 border-blue-500/40';
    else if (c.execution_risk_level === 'Low') riskBadge = 'bg-emerald-950 text-emerald-300 border-emerald-500/40';

    content.innerHTML = `
      <!-- Company Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-xl font-bold font-mono text-slate-100">${c.company_name}</h1>
            <span class="text-sm font-bold font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40">${c.ticker} (${c.exchange})</span>
            <span class="text-xs font-mono px-2 py-0.5 rounded border ${tierBadge}">${c.market_cap_tier}</span>
          </div>
          <div class="text-xs text-slate-400 font-mono mt-1">
            Sector: <span class="text-slate-200">${c.sector}</span> | Industry: <span class="text-slate-200">${c.industry}</span> | Market Cap: <span class="text-slate-200">₹${c.market_cap_inr_cr.toLocaleString('en-IN')} Cr</span>
          </div>
        </div>

        <div class="flex items-center gap-3 font-mono">
          <div class="text-right">
            <div class="text-[10px] text-slate-400 uppercase">Surge Multiplier</div>
            <div class="text-lg font-bold text-amber-400">🔥 ${c.surge_multiplier.toFixed(2)}x</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-slate-400 uppercase">Book-to-Bill</div>
            <div class="text-lg font-bold text-emerald-400">${c.book_to_bill_ratio.toFixed(2)}x</div>
          </div>
        </div>
      </div>

      <!-- Financial Order Pipeline Matrix -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="terminal-card p-3 rounded-lg border-l-4 border-emerald-500">
          <div class="text-[10px] font-mono uppercase text-slate-400 mb-1">Executable Order Book</div>
          <div class="text-lg font-bold font-mono text-emerald-400">₹${c.total_order_book_cr.toLocaleString('en-IN')} Cr</div>
          <div class="text-[10px] text-slate-500 font-mono">${c.delivery_timeline_months} Months Execution Cycle</div>
        </div>

        <div class="terminal-card p-3 rounded-lg border-l-4 border-cyan-500">
          <div class="text-[10px] font-mono uppercase text-slate-400 mb-1">Active Bidding Pipeline</div>
          <div class="text-lg font-bold font-mono text-cyan-400">₹${c.bidding_pipeline_cr.toLocaleString('en-IN')} Cr</div>
          <div class="text-[10px] text-slate-500 font-mono">Pending L1 & RFPs</div>
        </div>

        <div class="terminal-card p-3 rounded-lg border-l-4 border-purple-500">
          <div class="text-[10px] font-mono uppercase text-slate-400 mb-1">Total Pipeline (Book + Bids)</div>
          <div class="text-lg font-bold font-mono text-purple-400">₹${c.total_pipeline_cr.toLocaleString('en-IN')} Cr</div>
          <div class="text-[10px] text-slate-500 font-mono">${((c.total_pipeline_cr / c.ttm_revenue_cr)).toFixed(1)}x Annual Rev Coverage</div>
        </div>

        <div class="terminal-card p-3 rounded-lg border-l-4 border-amber-500">
          <div class="text-[10px] font-mono uppercase text-slate-400 mb-1">TTM Revenue</div>
          <div class="text-lg font-bold font-mono text-slate-200">₹${c.ttm_revenue_cr.toLocaleString('en-IN')} Cr</div>
          <div class="text-[10px] text-slate-500 font-mono">Recent Inflows: ₹${c.recent_order_inflows_cr.toLocaleString('en-IN')} Cr</div>
        </div>
      </div>

      <!-- Order Surge Thesis Narrative -->
      <div class="terminal-card p-4 rounded-lg border-l-4 border-emerald-500 space-y-1">
        <h3 class="text-xs font-mono uppercase text-emerald-400 font-bold flex items-center gap-1.5">
          <i class="fa-solid fa-lightbulb"></i> Order Surge Catalyst & Market Thesis
        </h3>
        <p class="text-xs text-slate-300 leading-relaxed font-sans">
          ${c.order_surge_thesis}
        </p>
        <div class="text-[11px] text-slate-400 font-mono pt-1 flex items-center justify-between">
          <span>Historical Avg Order Size: <strong class="text-slate-200">₹${c.historical_avg_order_size_cr.toFixed(1)} Cr</strong></span>
          <span>Recent Landmark Avg Order Size: <strong class="text-emerald-300 font-bold">₹${c.recent_avg_order_size_cr.toFixed(1)} Cr (${c.surge_multiplier.toFixed(1)}x)</strong></span>
        </div>
      </div>

      <!-- Landmark Orders Table -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-mono uppercase text-slate-300 font-bold flex items-center gap-2">
            <i class="fa-solid fa-receipt text-emerald-400"></i> Landmark Orders Won (${c.significant_orders?.length || 0})
          </h3>
          <span class="text-[11px] font-mono text-slate-400">High-conviction contracts</span>
        </div>

        <div class="terminal-card rounded-lg overflow-x-auto">
          <table class="w-full dense-table text-left">
            <thead>
              <tr>
                <th>Date & Tag</th>
                <th>Client Name</th>
                <th class="text-right">Value (₹ Cr)</th>
                <th class="text-right">% of TTM Rev</th>
                <th class="text-center">Surge Factor</th>
                <th>Scope of Work</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${(c.significant_orders || []).map(o => `
                <tr class="hover:bg-slate-800/40 border-b border-slate-800/50">
                  <td class="py-2 font-mono text-[11px]">
                    <div>${o.announcement_date}</div>
                    <span class="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">${o.order_significance_tag}</span>
                  </td>
                  <td class="py-2">
                    <div class="text-xs text-slate-200 font-mono font-medium">${o.client_name}</div>
                    <div class="text-[10px] text-slate-500 font-mono">${o.client_category}</div>
                  </td>
                  <td class="text-right py-2 font-mono font-bold text-emerald-400 text-xs">
                    ₹${o.order_value_cr.toLocaleString('en-IN')} Cr
                  </td>
                  <td class="text-right py-2 font-mono text-xs">
                    <span class="text-emerald-300 font-semibold">${o.pct_of_annual_revenue.toFixed(1)}%</span>
                  </td>
                  <td class="text-center py-2 font-mono text-xs">
                    <span class="text-amber-400 font-bold">${o.surge_factor.toFixed(1)}x</span>
                  </td>
                  <td class="py-2 text-xs text-slate-300 max-w-[260px] truncate" title="${o.scope_of_work}">
                    ${o.scope_of_work}
                  </td>
                  <td class="text-center py-2 font-mono text-[10px] text-emerald-400">
                    ${o.status}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Supply Chain Bottleneck & Lead Time Execution Radar -->
      <div class="terminal-card p-4 rounded-lg border-l-4 border-rose-500 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-mono uppercase text-rose-400 font-bold flex items-center gap-2">
            <i class="fa-solid fa-triangle-exclamation"></i> Critical Raw Material Choke & Execution Risk Radar
          </h3>
          <span class="text-xs font-mono px-2 py-0.5 rounded border ${riskBadge}">
            Execution Risk: ${c.execution_risk_level}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div class="bg-slate-900/80 p-3 rounded border border-slate-800 space-y-1">
            <div class="text-[10px] text-slate-400 uppercase">Primary Material Bottleneck:</div>
            <div class="text-sm font-bold text-slate-100">${c.primary_material_bottleneck}</div>
            <div class="text-xs text-amber-400 mt-1">
              Current Lead Time: <strong>${c.material_lead_time_weeks} Weeks</strong>
            </div>
          </div>

          <div class="bg-slate-900/80 p-3 rounded border border-slate-800 space-y-1">
            <div class="text-[10px] text-slate-400 uppercase">Delivery & Margin Sensitivity:</div>
            <p class="text-[11px] text-slate-300 font-sans leading-relaxed">
              Extended lead times create risk of liquidated damages (LDs) if procurement isn't secured with back-to-back indexation. Companies with high book-to-bill require upfront working capital drawdowns.
            </p>
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    content.innerHTML = `<div class="p-8 text-rose-400 text-xs font-mono">Error loading company dossier: ${err.message}</div>`;
  }
}

function closeCompanyOrderModal() {
  const modal = document.getElementById('order-pipeline-company-modal');
  if (modal) modal.classList.add('hidden');
}

// ==========================================
// 19. STRATEGIC SHORTAGE ARTICLES & OPPORTUNITY PLAYBOOKS
// ==========================================
let articleSearchTimer = null;
let currentActiveArticleMarkdown = '';

function debounceArticleSearch() {
  clearTimeout(articleSearchTimer);
  articleSearchTimer = setTimeout(() => {
    loadShortageArticlesView();
  }, 250);
}

function resetArticleFilters() {
  const cat = document.getElementById('filter-art-category');
  const sev = document.getElementById('filter-art-severity');
  const search = document.getElementById('filter-art-search');

  if (cat) cat.value = 'All';
  if (sev) sev.value = 'All';
  if (search) search.value = '';

  loadShortageArticlesView();
}

async function loadShortageArticlesView() {
  const cat = document.getElementById('filter-art-category')?.value || 'All';
  const sev = document.getElementById('filter-art-severity')?.value || 'All';
  const search = document.getElementById('filter-art-search')?.value || '';

  const params = new URLSearchParams();
  if (cat !== 'All') params.append('category', cat);
  if (sev !== 'All') params.append('severity', sev);
  if (search) params.append('search', search);

  const container = document.getElementById('articles-grid-container');
  if (container) {
    container.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500 font-mono text-xs"><i class="fa-solid fa-arrows-rotate animate-spin mr-2"></i> Loading strategic shortage intelligence dossiers...</div>`;
  }

  try {
    const res = await fetch(`/api/articles?${params.toString()}`);
    const data = await res.json();

    // Populate top KPI cards
    if (data.statistics) {
      const stats = data.statistics;
      const elTotal = document.getElementById('art-kpi-total-articles');
      const elGlobal = document.getElementById('art-kpi-global-tam');
      const elIndia = document.getElementById('art-kpi-india-tam');
      const elCrit = document.getElementById('art-kpi-crit-count');

      if (elTotal) elTotal.innerText = `${stats.total_articles} Dossiers`;
      if (elGlobal) elGlobal.innerText = `$${stats.total_tam_usd_bn} Bn`;
      if (elIndia) elIndia.innerText = `₹${(stats.total_india_tam_inr_cr).toLocaleString('en-IN')} Cr`;
      if (elCrit) elCrit.innerText = `${stats.critical_shortage_count} Critical`;
    }

    if (!container) return;

    if (!data.articles || data.articles.length === 0) {
      container.innerHTML = `
        <div class="col-span-full terminal-card p-12 text-center space-y-3">
          <i class="fa-solid fa-file-circle-question text-3xl text-slate-600"></i>
          <div class="text-sm font-mono text-slate-300">No shortage dossiers matched your current filters.</div>
          <p class="text-xs text-slate-500">Try searching for a different material, or click below to generate an on-demand dossier.</p>
          <button onclick="promptGenerateCustomArticle()" class="px-3 py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-semibold">
            Generate Custom Dossier
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = data.articles.map(a => {
      // Severity color
      let sevBadge = 'bg-slate-800 text-slate-300 border-slate-700';
      if (a.shortage_severity === 'Critical') sevBadge = 'bg-rose-950/90 text-rose-300 border-rose-500/60 font-bold';
      else if (a.shortage_severity === 'High') sevBadge = 'bg-amber-950/90 text-amber-300 border-amber-500/50 font-bold';
      else sevBadge = 'bg-blue-950/80 text-blue-300 border-blue-500/40';

      const indianCos = (a.key_companies_indian || []).slice(0, 3);
      const globalCos = (a.key_companies_global || []).slice(0, 3);

      return `
        <div class="terminal-card p-4 rounded-lg flex flex-col justify-between hover:border-purple-500/60 transition-all border border-slate-800 shadow-lg group">
          <div class="space-y-2.5">
            <!-- Header Badges -->
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                ${a.category}
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded border ${sevBadge}">
                  ${a.shortage_severity}
                </span>
                <span class="text-[10px] font-mono text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/30">
                  <i class="fa-solid fa-hourglass-half text-[9px]"></i> ${a.lead_time_current_weeks} wks
                </span>
              </div>
            </div>

            <!-- Title & Subtitle -->
            <div>
              <h3 class="text-sm font-bold text-slate-100 group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
                ${a.title}
              </h3>
              <p class="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                ${a.subtitle || ''}
              </p>
            </div>

            <!-- TAM Metrics Banner -->
            <div class="bg-slate-900/90 p-2.5 rounded border border-slate-800/80 grid grid-cols-3 gap-1.5 text-center font-mono">
              <div>
                <div class="text-[9px] text-slate-500 uppercase">Global TAM</div>
                <div class="text-xs font-bold text-cyan-400">$${a.market_size_tam_usd_bn}B</div>
              </div>
              <div class="border-x border-slate-800">
                <div class="text-[9px] text-slate-500 uppercase">India TAM</div>
                <div class="text-xs font-bold text-emerald-400">₹${a.market_size_india_inr_cr.toLocaleString('en-IN')}Cr</div>
              </div>
              <div>
                <div class="text-[9px] text-slate-500 uppercase">CAGR</div>
                <div class="text-xs font-bold text-purple-400">+${a.tam_cagr_pct}%</div>
              </div>
            </div>

            <!-- Indian Companies Fixing the Issue -->
            <div class="space-y-1">
              <div class="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                <i class="fa-solid fa-screwdriver-wrench text-emerald-400 text-[9px]"></i> Indian Corporate Action:
              </div>
              <div class="flex flex-wrap gap-1">
                ${indianCos.map(c => `
                  <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30" title="${c.action || ''}">
                    <strong>${c.ticker || c.name}</strong>: ${(c.action || '').slice(0, 42)}...
                  </span>
                `).join('')}
              </div>
            </div>

            <!-- Global Producers -->
            <div class="text-[10px] font-mono text-slate-400">
              <span class="text-slate-500">Global Majors:</span> ${globalCos.join(', ')}
            </div>
          </div>

          <!-- Card Footer Action -->
          <div class="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between">
            <span class="text-[10px] font-mono text-slate-500">Updated: ${a.last_updated}</span>
            <button onclick="openArticleModal('${a.id}')" class="px-3 py-1.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-mono text-xs font-semibold border border-purple-500/40 flex items-center gap-1.5 group-hover:bg-purple-600 group-hover:text-white transition-all">
              <span>Read Full Dossier</span>
              <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading shortage articles:', err);
    if (container) {
      container.innerHTML = `<div class="col-span-full text-center py-12 text-rose-400 font-mono text-xs">Failed to load shortage articles: ${err.message}</div>`;
    }
  }
}

async function openArticleModal(identifier) {
  const modal = document.getElementById('shortage-article-modal');
  const content = document.getElementById('shortage-article-modal-content');
  if (!modal || !content) return;

  modal.classList.remove('hidden');
  content.innerHTML = `
    <div class="flex items-center justify-center p-16 text-purple-400 font-mono text-xs">
      <i class="fa-solid fa-arrows-rotate animate-spin mr-2"></i> Loading comprehensive shortage intelligence dossier...
    </div>
  `;

  try {
    const res = await fetch(`/api/articles/${identifier}`);
    if (!res.ok) throw new Error('Shortage dossier could not be retrieved');
    const a = await res.json();

    currentActiveArticleMarkdown = a.full_article_markdown || '';

    // Convert markdown headings and lists simply for rich rendering
    const formatSection = (text) => {
      if (!text) return '';
      return text
        .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold font-mono text-purple-300 uppercase tracking-wider mt-4 mb-2 flex items-center gap-2 border-b border-purple-500/20 pb-1">$1</h3>')
        .replace(/^#### (.*$)/gim, '<h4 class="text-xs font-bold font-mono text-slate-200 mt-3 mb-1.5">$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100 font-semibold">$1</strong>')
        .replace(/^\* (.*$)/gim, '<li class="text-xs text-slate-300 ml-4 list-disc mb-1">$1</li>')
        .replace(/^(\d+)\. (.*$)/gim, '<li class="text-xs text-slate-300 ml-4 list-decimal mb-1">$2</li>');
    };

    // Severity styling
    let sevBadge = 'bg-slate-800 text-slate-300 border-slate-700';
    if (a.shortage_severity === 'Critical') sevBadge = 'bg-rose-950 text-rose-300 border-rose-500/60 font-bold';
    else if (a.shortage_severity === 'High') sevBadge = 'bg-amber-950 text-amber-300 border-amber-500/50 font-bold';
    else sevBadge = 'bg-blue-950 text-blue-300 border-blue-500/40';

    content.innerHTML = `
      <!-- Dossier Header -->
      <div class="space-y-3 pb-4 border-b border-slate-800">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40">
            ${a.category}
          </span>
          <span class="text-xs font-mono px-2 py-0.5 rounded border ${sevBadge}">
            Severity: ${a.shortage_severity}
          </span>
          <span class="text-xs font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/40 font-bold">
            <i class="fa-solid fa-hourglass-half"></i> Current Lead Time: ${a.lead_time_current_weeks} Weeks
          </span>
          <span class="text-xs font-mono text-slate-400 ml-auto">
            Dossier ID: <code class="text-slate-300">${a.id}</code>
          </span>
        </div>

        <h1 class="text-xl md:text-2xl font-bold font-mono text-slate-100 leading-tight">
          ${a.title}
        </h1>
        <p class="text-xs md:text-sm text-slate-400 leading-relaxed font-sans">
          ${a.subtitle || ''}
        </p>

        <!-- Key TAM Metrics Dashboard -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div class="terminal-card p-3 rounded-lg border-l-4 border-cyan-500">
            <div class="text-[10px] font-mono uppercase text-slate-400">Global TAM (2030)</div>
            <div class="text-lg font-bold font-mono text-cyan-400">$${a.market_size_tam_usd_bn} Billion</div>
            <div class="text-[10px] text-slate-500 font-mono">Worldwide Demand</div>
          </div>
          <div class="terminal-card p-3 rounded-lg border-l-4 border-emerald-500">
            <div class="text-[10px] font-mono uppercase text-slate-400">Indian Market TAM (2030)</div>
            <div class="text-lg font-bold font-mono text-emerald-400">₹${a.market_size_india_inr_cr.toLocaleString('en-IN')} Cr</div>
            <div class="text-[10px] text-slate-500 font-mono">Domestic & Export Runway</div>
          </div>
          <div class="terminal-card p-3 rounded-lg border-l-4 border-purple-500">
            <div class="text-[10px] font-mono uppercase text-slate-400">Projected CAGR</div>
            <div class="text-lg font-bold font-mono text-purple-400">+${a.tam_cagr_pct}%</div>
            <div class="text-[10px] text-slate-500 font-mono">Annual Compound Growth</div>
          </div>
          <div class="terminal-card p-3 rounded-lg border-l-4 border-amber-500">
            <div class="text-[10px] font-mono uppercase text-slate-400">Procurement Stretch</div>
            <div class="text-lg font-bold font-mono text-amber-400">${a.lead_time_current_weeks} Weeks</div>
            <div class="text-[10px] text-slate-500 font-mono">vs Normal Historical Baseline</div>
          </div>
        </div>
      </div>

      <!-- Pillar 1: What is Short in Terms of Supply and Why? -->
      <div class="terminal-card p-5 rounded-lg border-l-4 border-purple-500 space-y-2">
        ${formatSection(a.what_is_short_and_why)}
      </div>

      <!-- Pillar 2 & 3: Opportunities & Challenges Grid (World vs India) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Pillar 2: World Opportunities & Challenges -->
        <div class="terminal-card p-5 rounded-lg border-l-4 border-cyan-500 space-y-2">
          ${formatSection(a.world_opportunities_and_challenges)}
        </div>

        <!-- Pillar 3: Indian Companies Opportunities & Challenges -->
        <div class="terminal-card p-5 rounded-lg border-l-4 border-emerald-500 space-y-2">
          ${formatSection(a.india_opportunities_and_challenges)}
        </div>
      </div>

      <!-- Pillar 4: Overall Market Size & TAM Analysis -->
      <div class="terminal-card p-5 rounded-lg border-l-4 border-amber-500 space-y-2">
        ${formatSection(a.market_size_and_tam_analysis)}
      </div>

      <!-- Pillar 5: What Global & Indian Companies Are Doing to Fix the Issue -->
      <div class="terminal-card p-5 rounded-lg border-l-4 border-emerald-500 space-y-3">
        ${formatSection(a.global_and_indian_actions_to_fix)}

        <!-- Specific Indian Corporate Remediation Table -->
        ${(a.key_companies_indian && a.key_companies_indian.length > 0) ? `
          <div class="mt-4 pt-3 border-t border-slate-800">
            <div class="text-xs font-mono uppercase font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
              <i class="fa-solid fa-building-flag"></i> Key Indian Companies Fixing the Supply Deficit
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              ${a.key_companies_indian.map(c => `
                <div class="bg-slate-900/90 p-3 rounded border border-emerald-500/30 flex flex-col justify-between">
                  <div>
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-slate-100 font-mono text-xs">${c.name}</span>
                      <span class="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">${c.ticker || 'NSE'}</span>
                    </div>
                    <p class="text-xs text-slate-300 font-sans mt-1.5 leading-relaxed">
                      ${c.action || ''}
                    </p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

  } catch (err) {
    content.innerHTML = `<div class="p-8 text-rose-400 text-xs font-mono">Error opening shortage dossier: ${err.message}</div>`;
  }
}

function closeArticleModal() {
  const modal = document.getElementById('shortage-article-modal');
  if (modal) modal.classList.add('hidden');
}

function copyCurrentArticleMarkdown() {
  if (!currentActiveArticleMarkdown) return;
  navigator.clipboard.writeText(currentActiveArticleMarkdown).then(() => {
    const btn = document.getElementById('btn-copy-article');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = `<i class="fa-solid fa-check text-emerald-400"></i> Copied Markdown!`;
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
  });
}

function promptGenerateCustomArticle() {
  const topic = prompt("Enter a commodity, component, or critical supply shortage topic to generate an instant strategic intelligence dossier:\n(e.g., 'Uranium Enrichment', 'Gallium Nitride', 'Titanium Forgings', 'Electronic HF Acid', 'Copper Cathode')");
  if (topic && topic.trim()) {
    openArticleModal(topic.trim());
  }
}


