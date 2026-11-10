// Interactive Causal Chain & Downstream Impact Visualizer

function renderCausalChain(containerId, causalLinks) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!causalLinks || causalLinks.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-slate-500 text-sm">
        <i class="fa-solid fa-circle-nodes text-2xl mb-2 text-slate-600"></i>
        <p>No explicit causal graph mapped for this event yet.</p>
      </div>`;
    return;
  }

  let html = `<div class="space-y-3 py-2">`;
  causalLinks.forEach((link, idx) => {
    const isVerified = link.relationship_type === "VERIFIED";
    const borderClass = isVerified ? "causal-node-verified" : "causal-node-inferred";
    const badgeBg = isVerified ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-amber-500/20 text-amber-400 border border-amber-500/40";
    const icon = isVerified ? "fa-shield-check text-emerald-400" : "fa-brain-circuit text-amber-400";
    const badgeText = isVerified ? "VERIFIED CAUSATION" : `AI-INFERRED RELATIONSHIP (${link.confidence_pct?.toFixed(0)}%)`;

    html += `
      <div class="p-3.5 rounded-lg ${borderClass} relative">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-slate-800 text-xs font-mono font-bold flex items-center justify-center text-cyan-400 border border-slate-700">${link.step_order}</span>
            <span class="text-xs terminal-badge px-2 py-0.5 rounded ${badgeBg}">
              <i class="fa-solid ${icon} mr-1"></i>${badgeText}
            </span>
          </div>
          <span class="text-xs text-slate-400 font-mono">${link.confidence_pct ? link.confidence_pct.toFixed(0) + '% Confidence' : ''}</span>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-11 items-center gap-2 text-sm">
          <div class="md:col-span-5 p-2 rounded bg-slate-900/60 border border-slate-800">
            <div class="text-xs text-slate-400 uppercase font-mono tracking-wider mb-0.5">Trigger / Upstream</div>
            <div class="text-slate-200 font-medium">${link.from_node}</div>
          </div>
          
          <div class="md:col-span-1 flex justify-center py-1 md:py-0">
            <i class="fa-solid fa-arrow-down md:fa-arrow-right text-slate-500 text-lg"></i>
          </div>

          <div class="md:col-span-5 p-2 rounded bg-slate-900/60 border border-slate-800">
            <div class="text-xs text-slate-400 uppercase font-mono tracking-wider mb-0.5">Direct Consequence</div>
            <div class="text-slate-200 font-medium">${link.to_node}</div>
          </div>
        </div>

        ${link.notes ? `
          <div class="mt-2 text-xs text-slate-400 flex items-start gap-1.5 pt-1.5 border-t border-slate-800/60">
            <i class="fa-solid fa-quote-left text-slate-500 mt-0.5"></i>
            <span>${link.notes}</span>
          </div>` : ''}
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function renderDownstreamImpactTree(containerId, rawMaterial, intermediate, component, industries, finishedProducts) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const industriesList = Array.isArray(industries) ? industries : (industries ? [industries] : ["General Manufacturing"]);
  const finishedList = Array.isArray(finishedProducts) ? finishedProducts : (finishedProducts ? [finishedProducts] : ["Downstream Commercial Systems"]);

  container.innerHTML = `
    <div class="p-4 rounded-lg bg-slate-900/80 border border-slate-800">
      <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <h4 class="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
          <i class="fa-solid fa-sitemap"></i> 5-Phase Downstream Value Chain Cascade
        </h4>
        <span class="text-xs text-slate-400 font-mono">Upstream $\\rightarrow$ Downstream</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
        <!-- 1. Raw Material -->
        <div class="p-3 rounded-lg bg-slate-800/60 border border-cyan-500/40 relative">
          <div class="text-[10px] font-mono uppercase text-cyan-400 font-bold mb-1">1. Raw Material</div>
          <div class="text-sm font-semibold text-slate-100">${rawMaterial || 'Primary Commodity'}</div>
        </div>

        <!-- 2. Intermediate -->
        <div class="p-3 rounded-lg bg-slate-800/60 border border-blue-500/40 relative">
          <div class="text-[10px] font-mono uppercase text-blue-400 font-bold mb-1">2. Intermediate</div>
          <div class="text-sm font-semibold text-slate-100">${intermediate || 'Refined Feedstock'}</div>
        </div>

        <!-- 3. Component -->
        <div class="p-3 rounded-lg bg-slate-800/60 border border-purple-500/40 relative">
          <div class="text-[10px] font-mono uppercase text-purple-400 font-bold mb-1">3. Sub-Component</div>
          <div class="text-sm font-semibold text-slate-100">${component || 'Fabricated Parts'}</div>
        </div>

        <!-- 4. Industry -->
        <div class="p-3 rounded-lg bg-slate-800/60 border border-amber-500/40 relative">
          <div class="text-[10px] font-mono uppercase text-amber-400 font-bold mb-1">4. Exposed Industry</div>
          <div class="text-sm font-semibold text-slate-100">${industriesList[0] || 'Manufacturing'}</div>
        </div>

        <!-- 5. Finished Product -->
        <div class="p-3 rounded-lg bg-slate-800/60 border border-rose-500/40 relative">
          <div class="text-[10px] font-mono uppercase text-rose-400 font-bold mb-1">5. End Product / Lead Time</div>
          <div class="text-sm font-semibold text-slate-100">${finishedList[0] || 'End Assembly'}</div>
        </div>
      </div>
    </div>
  `;
}
