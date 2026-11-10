// Leaflet Geospatial Intelligence Map Handler
let intelligenceMap = null;
let markersLayer = null;

function initIntelligenceMap() {
  const mapElement = document.getElementById("leaflet-map");
  if (!mapElement || intelligenceMap) return;

  // Initialize map centered on global view
  intelligenceMap = L.map("leaflet-map", {
    center: [25.0, 15.0],
    zoom: 2.3,
    minZoom: 1.8,
    maxZoom: 10,
    zoomControl: true,
    attributionControl: false
  });

  // Dark cartographic tiles
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(intelligenceMap);

  markersLayer = L.layerGroup().addTo(intelligenceMap);
  loadMapMarkers();
}

async function loadMapMarkers() {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  try {
    const res = await fetch("/api/map/markers");
    const data = await res.json();

    data.markers.forEach(m => {
      // Create custom pulsing circle marker
      const radius = Math.max(7, Math.min(18, (m.severity / 100) * 16));
      
      const marker = L.circleMarker([m.lat, m.lng], {
        radius: radius,
        fillColor: m.color,
        color: "#ffffff",
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.75
      });

      const popupContent = `
        <div class="p-2 text-slate-900 font-sans" style="min-width: 240px;">
          <div class="flex items-center justify-between mb-1 pb-1 border-b border-slate-200">
            <span class="text-xs font-bold font-mono uppercase text-slate-600">${m.country}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style="background-color: ${m.color}">
              ${m.status_text} (${m.severity.toFixed(0)})
            </span>
          </div>
          <div class="text-xs font-bold text-slate-800 mb-1 leading-snug">${m.title}</div>
          <div class="text-[11px] text-slate-600 mb-1">
            <span class="font-semibold text-slate-700">Material:</span> ${m.material_affected}
          </div>
          ${m.price_impact ? `
            <div class="text-[11px] text-rose-700 font-medium mb-1">
              <span class="font-semibold">Price Impact:</span> ${m.price_impact}
            </div>` : ''}
          <div class="mt-2 pt-1.5 border-t border-slate-200 flex justify-between items-center">
            <button onclick="openCountryDrawer('${m.country}')" class="text-xs bg-slate-900 text-cyan-400 hover:text-cyan-300 px-2.5 py-1 rounded font-mono font-medium">
              <i class="fa-solid fa-flag mr-1"></i> Inspect Country
            </button>
            <button onclick="openEventDetail('${m.event_id}')" class="text-xs bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 py-1 rounded font-medium">
              Event Details
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersLayer.addLayer(marker);
    });
  } catch (err) {
    console.error("Failed to load map markers:", err);
  }
}

async function openCountryDrawer(countryName) {
  const drawer = document.getElementById("country-intelligence-drawer");
  const content = document.getElementById("country-drawer-content");
  if (!drawer || !content) return;

  drawer.classList.remove("translate-x-full");
  content.innerHTML = `
    <div class="p-8 text-center text-slate-400">
      <i class="fa-solid fa-spinner fa-spin text-3xl mb-3 text-cyan-400"></i>
      <p class="font-mono text-xs">Querying sovereign supply risk intelligence for ${countryName}...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/map/country/${encodeURIComponent(countryName)}`);
    const data = await res.json();

    let html = `
      <div class="space-y-5">
        <!-- Header -->
        <div class="p-4 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div class="text-xs font-mono uppercase tracking-widest text-cyan-400">Country Risk Profile</div>
            <h2 class="text-xl font-bold text-slate-100 flex items-center gap-2">
              <i class="fa-solid fa-earth-americas text-cyan-400"></i> ${data.country}
            </h2>
          </div>
          <div class="text-right">
            <div class="text-2xl font-mono font-bold text-rose-400">${data.active_disruptions_count}</div>
            <div class="text-[11px] font-mono uppercase text-slate-400">Active Disruptions</div>
          </div>
        </div>

        <!-- Affected Commodities -->
        <div class="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
          <h4 class="text-xs font-mono uppercase text-slate-300 font-bold mb-2 flex items-center gap-2">
            <i class="fa-solid fa-cubes-stacked text-amber-400"></i> Strategic Materials & Commodities Impacted
          </h4>
          <div class="flex flex-wrap gap-1.5">
            ${data.affected_commodities.length ? data.affected_commodities.map(m => `
              <span class="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200">
                ${m}
              </span>
            `).join('') : '<span class="text-xs text-slate-500 font-mono">None directly designated</span>'}
          </div>
        </div>

        <!-- Disruption Events List -->
        <div>
          <h4 class="text-xs font-mono uppercase text-slate-300 font-bold mb-2 flex items-center gap-2">
            <i class="fa-solid fa-triangle-exclamation text-rose-400"></i> Active Disruption Log
          </h4>
          <div class="space-y-2.5">
            ${data.active_disruptions.length ? data.active_disruptions.map(ev => `
              <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer" onclick="openEventDetail('${ev.id}')">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-mono uppercase text-cyan-400">${ev.category}</span>
                  <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    Sev ${ev.severity.toFixed(0)}
                  </span>
                </div>
                <div class="text-sm font-semibold text-slate-200 mb-1">${ev.title}</div>
                <div class="text-xs text-slate-400 flex items-center justify-between">
                  <span>Start: <span class="font-mono text-slate-300">${ev.start_date}</span></span>
                  <span class="text-amber-400 font-mono">${ev.status}</span>
                </div>
              </div>
            `).join('') : '<div class="text-xs text-slate-500 font-mono p-3">No active high-severity disruptions logged.</div>'}
          </div>
        </div>

        <!-- Policy Changes -->
        <div>
          <h4 class="text-xs font-mono uppercase text-slate-300 font-bold mb-2 flex items-center gap-2">
            <i class="fa-solid fa-gavel text-purple-400"></i> Enacted Policies & Tariffs
          </h4>
          <div class="space-y-2">
            ${data.policy_changes.length ? data.policy_changes.map(pol => `
              <div class="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-mono font-bold text-purple-400">${pol.policy_type}</span>
                  <span class="text-[11px] font-mono text-slate-400">Eff: ${pol.effective_date}</span>
                </div>
                <div class="text-xs font-medium text-slate-200 mb-1">${pol.policy_name}</div>
                <div class="text-[11px] text-slate-400">${pol.supply_impact}</div>
              </div>
            `).join('') : '<div class="text-xs text-slate-500 font-mono p-3">No restrictive trade policies recorded.</div>'}
          </div>
        </div>
      </div>
    `;

    content.innerHTML = html;
  } catch (err) {
    content.innerHTML = `<div class="p-6 text-rose-400 text-xs font-mono">Error querying country data: ${err.message}</div>`;
  }
}

function closeCountryDrawer() {
  const drawer = document.getElementById("country-intelligence-drawer");
  if (drawer) drawer.classList.add("translate-x-full");
}
