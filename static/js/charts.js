// Chart.js Handlers for Terminal Analytics
let riskGaugeChart = null;
let pricePressureChart = null;
let historicalFrequencyChart = null;
let leadTimeScatterChart = null;

function initCharts() {
  // If Chart.js isn't loaded yet, return
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  Chart.defaults.borderColor = '#1e293b';
}

function renderGlobalRiskGauge(avgScore) {
  const ctx = document.getElementById('risk-gauge-canvas');
  if (!ctx || typeof Chart === 'undefined') return;

  if (riskGaugeChart) riskGaugeChart.destroy();

  const score = Math.min(100, Math.max(0, avgScore || 72));
  const remaining = 100 - score;

  let color = '#10b981';
  if (score >= 80) color = '#ef4444';
  else if (score >= 65) color = '#f97316';
  else if (score >= 40) color = '#f59e0b';

  riskGaugeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [score, remaining],
        backgroundColor: [color, '#1e293b'],
        borderWidth: 0,
        circumference: 180,
        rotation: 270
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '78%',
      plugins: {
        tooltip: { enabled: false }
      }
    }
  });

  const valEl = document.getElementById('gauge-score-value');
  if (valEl) valEl.innerText = score.toFixed(1);
}

function renderPricePressureBreakdown(breakdown) {
  const ctx = document.getElementById('price-pressure-canvas');
  if (!ctx || typeof Chart === 'undefined') return;

  if (pricePressureChart) pricePressureChart.destroy();

  pricePressureChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Rising', 'Building', 'Future', 'Uncertain'],
      datasets: [{
        label: 'Events Count',
        data: [breakdown.rising || 6, breakdown.building || 5, breakdown.future || 4, breakdown.uncertain || 2],
        backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#64748b'],
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 2 }
        }
      }
    }
  });
}

function renderHistoricalTimelineChart(timelineData) {
  const ctx = document.getElementById('historical-timeline-canvas');
  if (!ctx || typeof Chart === 'undefined') return;

  if (historicalFrequencyChart) historicalFrequencyChart.destroy();

  const labels = timelineData?.labels || ['Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26'];
  const geopolitical = timelineData?.geopolitical || [2, 3, 4, 3, 5, 4, 3, 4, 5, 6, 5, 7];
  const tradePolicy = timelineData?.tradePolicy || [1, 2, 2, 3, 2, 4, 5, 3, 4, 5, 4, 6];
  const manufacturing = timelineData?.manufacturing || [2, 1, 3, 2, 3, 3, 2, 4, 3, 3, 4, 3];

  historicalFrequencyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Geopolitical & Conflict',
          data: geopolitical,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Export Bans & Tariffs',
          data: tradePolicy,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Factory & Supply Stoppages',
          data: manufacturing,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Disruptions Initiated' }
        }
      }
    }
  });
}
