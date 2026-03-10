/* ============================================================
   FINSIGHT – APP LOGIC (app.js)
   ============================================================ */

/* ======================== DATA ======================== */
const CATEGORIES = [
  { id: 'food',       name: 'Food & Dining',    icon: '🍽️',  color: '#f59e0b' },
  { id: 'shopping',   name: 'Shopping',          icon: '🛍️',  color: '#ec4899' },
  { id: 'transport',  name: 'Transport',         icon: '🚗',  color: '#06b6d4' },
  { id: 'medical',    name: 'Medical',           icon: '💊',  color: '#ef4444' },
  { id: 'rent',       name: 'Rent',              icon: '🏠',  color: '#8b5cf6' },
  { id: 'bills',      name: 'Bills & Utilities', icon: '⚡',  color: '#f97316' },
  { id: 'entertain',  name: 'Entertainment',     icon: '🎮',  color: '#a855f7' },
  { id: 'gym',        name: 'Gym & Fitness',     icon: '💪',  color: '#22c55e' },
  { id: 'travel',     name: 'Travel',            icon: '✈️',  color: '#3b82f6' },
  { id: 'education',  name: 'Education',         icon: '📚',  color: '#10b981' },
  { id: 'personal',   name: 'Personal Care',     icon: '💆',  color: '#f472b6' },
  { id: 'lending',    name: 'Lending',           icon: '🤝',  color: '#84cc16' },
  { id: 'party',      name: 'Party',             icon: '🎉',  color: '#f59e0b' },
  { id: 'mandir',     name: 'Mandir',            icon: '🙏',  color: '#fbbf24' },
  { id: 'bet',        name: 'Bet',               icon: '🎲',  color: '#6366f1' },
  { id: 'salary',     name: 'Salary',            icon: '💰',  color: '#22c55e' },
  { id: 'freelance',  name: 'Freelance',         icon: '💻',  color: '#06b6d4' },
  { id: 'investment', name: 'Investment',        icon: '📈',  color: '#8b5cf6' },
  { id: 'gift',       name: 'Gift',              icon: '🎁',  color: '#ec4899' },
  { id: 'others',     name: 'Others',            icon: '📦',  color: '#64748b' },
];

const INCOME_CATS = ['salary','freelance','investment','gift','others'];
const DEFAULT_ACCOUNTS = [
  { id: 'cash',  name: 'Cash',    type: 'cash',  balance: 0 },
  { id: 'bank1', name: 'SBI',     type: 'bank',  balance: 0 },
];

/* ======================== STATE ======================== */
let DB = loadDB();
let dashPeriod      = 'week';
let txnPeriod       = 'all';
let analysisPeriod  = 'month';
let analysisOffset  = 0;
let selectedCat     = null;
let selectedType    = 'expense';
let editTxnId       = null;

/* ======================== CHARTS ======================== */
let overviewChart   = null;
let categoryChart   = null;
let analysisTrendCh = null;
let analysisCatCh   = null;

/* ======================== DB HELPERS ======================== */
function loadDB() {
  try {
    return JSON.parse(localStorage.getItem('finsight_db')) || freshDB();
  } catch { return freshDB(); }
}
function freshDB() {
  return {
    txns:     [],
    accounts: JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS)),
    budgets:  [],
    settings: { name: 'User', currency: '₹' }
  };
}
function saveDB() {
  localStorage.setItem('finsight_db', JSON.stringify(DB));
}
function getCur() { return DB.settings.currency || '₹'; }
function fmt(n) { return getCur() + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

/* ======================== DATE HELPERS ======================== */
function today() { return new Date().toISOString().slice(0,10); }
function nowTime() { return new Date().toTimeString().slice(0,5); }

function periodRange(period, offset = 0) {
  const now = new Date();
  let from, to;
  if (period === 'week') {
    const day = now.getDay(); // 0=Sun
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Mon
    const mon = new Date(now); mon.setDate(diff + offset * 7); mon.setHours(0,0,0,0);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
    from = mon; to = sun;
  } else if (period === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    from = new Date(d.getFullYear(), d.getMonth(), 1);
    to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === 'year') {
    const y = now.getFullYear() + offset;
    from = new Date(y, 0, 1);
    to   = new Date(y, 11, 31, 23, 59, 59, 999);
  }
  return { from, to };
}

function inRange(dateStr, from, to) {
  const d = new Date(dateStr);
  return d >= from && d <= to;
}
function filterTxns(txns, period, offset = 0, customFrom, customTo) {
  if (period === 'all') return txns;
  if (period === 'custom') {
    if (!customFrom || !customTo) return txns;
    const f = new Date(customFrom + 'T00:00:00');
    const t = new Date(customTo   + 'T23:59:59');
    return txns.filter(tx => inRange(tx.date, f, t));
  }
  const { from, to } = periodRange(period, offset);
  return txns.filter(tx => inRange(tx.date, from, to));
}

function periodLabel(period, offset) {
  if (period === 'week') {
    const { from, to } = periodRange('week', offset);
    return from.toLocaleDateString('en-IN', { day:'numeric', month:'short' }) +
      ' – ' + to.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  }
  if (period === 'month') {
    const { from } = periodRange('month', offset);
    return from.toLocaleDateString('en-IN', { month:'long', year:'numeric' });
  }
  if (period === 'year') {
    const { from } = periodRange('year', offset);
    return from.getFullYear().toString();
  }
  return '';
}

/* ======================== INIT ======================== */
document.addEventListener('DOMContentLoaded', () => {
  applySettings();
  populateCatFilter();
  populateCatGrid();
  populateAccountSelect();
  setTxnDefaults();
  renderAll();
  setGreeting();
  registerSW();
});

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

/* ======================== PAGE NAVIGATION ======================== */
function showPage(pageId, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.bn-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  // Sync both nav bars
  document.querySelectorAll(`[data-page="${pageId}"]`).forEach(n => n.classList.add('active'));

  if (pageId === 'dashboard')    renderDashboard();
  if (pageId === 'transactions') renderTransactions();
  if (pageId === 'analysis')     renderAnalysis();
  if (pageId === 'budgets')      renderBudgets();
  if (pageId === 'accounts')     renderAccounts();
  if (pageId === 'settings')     loadSettings();

  return false;
}

function renderAll() {
  renderDashboard();
  renderTransactions();
  renderAnalysis();
  renderBudgets();
  renderAccounts();
}

/* ======================== GREETING ======================== */
function setGreeting() {
  const h = new Date().getHours();
  const name = DB.settings.name || 'User';
  const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dashGreeting').textContent = `${g}, ${name} 👋`;
}

/* ======================== DASHBOARD ======================== */
function setDashPeriod(p, el) {
  dashPeriod = p;
  document.querySelectorAll('#dashPeriodTabs .ptab').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderDashboard();
}

function renderDashboard() {
  const txns = filterTxns(DB.txns, dashPeriod);
  const spent  = txns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const income = txns.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const bal    = income - spent;
  const subMap = { week: 'This week', month: 'This month', year: 'This year' };

  document.getElementById('dashSpent').textContent     = fmt(spent);
  document.getElementById('dashIncome').textContent    = fmt(income);
  document.getElementById('dashBalance').textContent   = (bal >= 0 ? '' : '-') + fmt(bal);
  document.getElementById('dashTxnCount').textContent  = txns.length;
  document.getElementById('dashSpentSub').textContent  = subMap[dashPeriod];
  document.getElementById('dashIncomeSub').textContent = subMap[dashPeriod];
  document.getElementById('dashTxnSub').textContent    = subMap[dashPeriod];

  const balEl = document.getElementById('dashBalance');
  balEl.style.color = bal >= 0 ? 'var(--green)' : 'var(--red)';

  renderOverviewChart(txns);
  renderCategoryDoughnut(txns, 'categoryChart');

  // Recent 5
  const recent = [...DB.txns].sort((a,b) => new Date(b.date+' '+b.time) - new Date(a.date+' '+a.time)).slice(0, 5);
  document.getElementById('dashRecentList').innerHTML = recent.length
    ? recent.map(t => txnItemHTML(t)).join('')
    : emptyState('No transactions yet', 'Add your first transaction!');
}

function renderOverviewChart(txns) {
  // Group by day (last 7 or 30 based on period)
  const days = dashPeriod === 'year' ? 12 : dashPeriod === 'month' ? 30 : 7;
  const labels = [];
  const expData = [];
  const incData = [];

  if (dashPeriod === 'year') {
    for (let m = 0; m < 12; m++) {
      const label = new Date(2000, m, 1).toLocaleDateString('en-IN', { month: 'short' });
      labels.push(label);
      const mTxns = txns.filter(t => new Date(t.date).getMonth() === m);
      expData.push(mTxns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
      incData.push(mTxns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
    }
    document.getElementById('dashChartLabel').textContent = 'This year';
  } else {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const str = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString('en-IN', { day:'numeric', month:'short' }));
      const day = txns.filter(t => t.date === str);
      expData.push(day.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
      incData.push(day.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
    }
    document.getElementById('dashChartLabel').textContent = dashPeriod === 'month' ? 'Last 30 days' : 'Last 7 days';
  }

  const ctx = document.getElementById('overviewChart').getContext('2d');
  if (overviewChart) overviewChart.destroy();
  overviewChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Expense', data: expData, backgroundColor: 'rgba(239,68,68,.7)', borderRadius: 6, borderSkipped: false },
        { label: 'Income',  data: incData, backgroundColor: 'rgba(34,197,94,.6)', borderRadius: 6, borderSkipped: false },
      ]
    },
    options: chartOpts()
  });
}

function renderCategoryDoughnut(txns, canvasId) {
  const expTxns = txns.filter(t => t.type === 'expense');
  const catTotals = {};
  expTxns.forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
  });
  const cats = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const labels = cats.map(([id]) => getCatById(id)?.name || id);
  const data   = cats.map(([, v]) => v);
  const colors = cats.map(([id]) => getCatById(id)?.color || '#6c63ff');

  const ctx = document.getElementById(canvasId).getContext('2d');
  if (canvasId === 'categoryChart' && categoryChart) categoryChart.destroy();
  if (canvasId === 'analysisCatChart' && analysisCatCh) analysisCatCh.destroy();

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#13162a', hoverOffset: 8 }] },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right', labels: { color: '#8b92b8', font: { family: 'Inter', size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 10 } },
        tooltip: { callbacks: { label: (c) => ` ${c.label}: ${getCur()}${c.raw.toLocaleString('en-IN')}` } }
      }
    }
  });
  if (canvasId === 'categoryChart')  categoryChart  = chart;
  if (canvasId === 'analysisCatChart') analysisCatCh = chart;
}

function chartOpts() {
  return {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#8b92b8', font: { family: 'Inter', size: 12 }, usePointStyle: true } },
      tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${getCur()}${c.raw.toLocaleString('en-IN')}` } }
    },
    scales: {
      x: { ticks: { color: '#545b7a', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,.04)' } },
      y: { ticks: { color: '#545b7a', font: { size: 11 }, callback: v => getCur() + v.toLocaleString('en-IN') }, grid: { color: 'rgba(255,255,255,.04)' } }
    }
  };
}

/* ======================== TRANSACTIONS ======================== */
let txnCustomFrom = '', txnCustomTo = '';

function setTxnPeriod(p, el) {
  txnPeriod = p;
  document.querySelectorAll('#txnPeriodTabs .ptab').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('customDateRange').style.display = p === 'custom' ? 'flex' : 'none';
  renderTransactions();
}

function applyCustomRange() {
  txnCustomFrom = document.getElementById('customFrom').value;
  txnCustomTo   = document.getElementById('customTo').value;
  renderTransactions();
}

function renderTransactions() {
  const typeF = document.getElementById('txnTypeFilter').value;
  const catF  = document.getElementById('txnCatFilter').value;
  const q     = document.getElementById('txnSearch').value.trim().toLowerCase();

  let txns = filterTxns(DB.txns, txnPeriod, 0, txnCustomFrom, txnCustomTo);
  if (typeF !== 'all') txns = txns.filter(t => t.type === typeF);
  if (catF  !== 'all') txns = txns.filter(t => t.category === catF);
  if (q) txns = txns.filter(t => (t.notes||'').toLowerCase().includes(q) || getCatById(t.category)?.name.toLowerCase().includes(q));

  const spent  = txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const income = txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const net    = income - spent;

  document.getElementById('txnCount').textContent = `${txns.length} record${txns.length !== 1 ? 's' : ''}`;
  document.getElementById('txnSummaryBar').innerHTML =
    `<div class="tsb-item"><span>Expense</span> <span style="color:var(--red)">${fmt(spent)}</span></div>` +
    `<div class="tsb-item"><span>Income</span>  <span style="color:var(--green)">${fmt(income)}</span></div>` +
    `<div class="tsb-item"><span>Net</span>      <span style="color:${net>=0?'var(--green)':'var(--red)'}">${net<0?'-':''}${fmt(net)}</span></div>` +
    `<div class="tsb-item"><span>Records</span>  <span>${txns.length}</span></div>`;

  // Group by date
  const sorted = [...txns].sort((a,b) => new Date(b.date+' '+b.time) - new Date(a.date+' '+a.time));
  const groups = {};
  sorted.forEach(t => {
    (groups[t.date] = groups[t.date] || []).push(t);
  });

  const html = Object.keys(groups).sort((a,b)=>b.localeCompare(a)).map(date => {
    const dayTxns = groups[date];
    const dayLabel = new Date(date).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short', year:'numeric' });
    return `<div class="txn-day-group">
      <div class="txn-day-label">${dayLabel}</div>
      <div class="txn-list">${dayTxns.map(t => txnItemHTML(t, true)).join('')}</div>
    </div>`;
  }).join('');

  document.getElementById('txnFullList').innerHTML = html ||
    `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No Transactions</div><div class="empty-sub">Change filters or add a transaction</div></div>`;
}

function txnItemHTML(t, showDelete = false) {
  const cat = getCatById(t.category);
  const cls = t.type === 'expense' ? 'exp' : t.type === 'income' ? 'inc' : 'trf';
  const sign = t.type === 'expense' ? '-' : t.type === 'income' ? '+' : '↔';
  return `<div class="txn-item" onclick="editTransaction('${t.id}')">
    <div class="txn-icon" style="background:${cat?.color || '#555'}22">${cat?.icon || '📦'}</div>
    <div class="txn-info">
      <div class="txn-cat">${cat?.name || t.category}</div>
      <div class="txn-note">${t.notes || (getAccountName(t.account) || '')}</div>
      <div class="txn-date-small">${t.time || ''}</div>
    </div>
    <div class="txn-amt ${cls}">${sign}${fmt(t.amount)}</div>
  </div>`;
}

/* ======================== ANALYSIS ======================== */
function setAnalysisPeriod(p, el) {
  analysisPeriod = p;
  analysisOffset = 0;
  document.querySelectorAll('#analysisPeriodTabs .ptab').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('analysisCustomDate').style.display = p === 'custom' ? 'flex' : 'none';
  renderAnalysis();
}

function renderAnalysis() {
  let txns;
  let navHTML = '';

  if (analysisPeriod === 'custom') {
    const f = document.getElementById('analysisFrom').value;
    const t = document.getElementById('analysisTo').value;
    txns = filterTxns(DB.txns, 'custom', 0, f, t);
    document.getElementById('analysisNav').innerHTML = '';
  } else {
    txns = filterTxns(DB.txns, analysisPeriod, analysisOffset);
    const label = periodLabel(analysisPeriod, analysisOffset);
    document.getElementById('analysisNav').innerHTML =
      `<button onclick="analysisShift(-1)">‹</button>
       <span class="analysis-nav-label">${label}</span>
       <button onclick="analysisShift(1)" ${analysisOffset >= 0 ? 'disabled style="opacity:.4"' : ''}>›</button>`;
  }

  const spent  = txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const income = txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const net    = income - spent;
  const count  = txns.length;

  document.getElementById('analysisCards').innerHTML =
    `<div class="card card-expense glow-red"><div class="card-label">Total Spent</div><div class="card-amount">${fmt(spent)}</div></div>
     <div class="card card-income glow-green"><div class="card-label">Total Income</div><div class="card-amount">${fmt(income)}</div></div>
     <div class="card card-balance glow-blue"><div class="card-label">Net Balance</div><div class="card-amount" style="color:${net>=0?'var(--green)':'var(--red)'}">${net<0?'-':''}${fmt(net)}</div></div>
     <div class="card card-txn glow-purple"><div class="card-label">Transactions</div><div class="card-amount">${count}</div></div>`;

  renderAnalysisTrend(txns);
  renderCategoryDoughnut(txns, 'analysisCatChart');
  renderCatBreakdown(txns);
}

function analysisShift(dir) {
  analysisOffset = Math.min(0, analysisOffset + dir);
  renderAnalysis();
}

function renderAnalysisTrend(txns) {
  const labels = [], expData = [], incData = [];

  if (analysisPeriod === 'year') {
    for (let m = 0; m < 12; m++) {
      labels.push(new Date(2000,m,1).toLocaleDateString('en-IN',{month:'short'}));
      const mT = txns.filter(t => new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === (new Date().getFullYear() + analysisOffset));
      expData.push(mT.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
      incData.push(mT.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
    }
  } else if (analysisPeriod === 'month') {
    const { from } = periodRange('month', analysisOffset);
    const daysInMonth = new Date(from.getFullYear(), from.getMonth()+1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      labels.push(d.toString());
      const str = `${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dT = txns.filter(t=>t.date===str);
      expData.push(dT.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
      incData.push(dT.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
    }
  } else {
    // week – daily
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i + analysisOffset * 7);
      const str = d.toISOString().slice(0,10);
      labels.push(d.toLocaleDateString('en-IN',{weekday:'short'}));
      const dT = txns.filter(t=>t.date===str);
      expData.push(dT.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
      incData.push(dT.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
    }
  }

  const ctx = document.getElementById('analysisTrendChart').getContext('2d');
  if (analysisTrendCh) analysisTrendCh.destroy();
  analysisTrendCh = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'Expense', data: expData, borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,.1)', fill:true, tension:.4, pointRadius:3 },
        { label:'Income',  data: incData, borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,.1)',  fill:true, tension:.4, pointRadius:3 },
      ]
    },
    options: chartOpts()
  });
}

function renderCatBreakdown(txns) {
  const expTxns = txns.filter(t=>t.type==='expense');
  const total   = expTxns.reduce((s,t)=>s+t.amount, 0);
  const catMap  = {};
  expTxns.forEach(t => { catMap[t.category] = (catMap[t.category]||0) + t.amount; });
  const sorted = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);

  document.getElementById('catBreakdownList').innerHTML = sorted.length
    ? sorted.map(([id, amt]) => {
        const cat = getCatById(id);
        const pct = total ? Math.round(amt/total*100) : 0;
        return `<div class="cat-row">
          <div class="cat-row-icon" style="background:${cat?.color||'#555'}22">${cat?.icon||'📦'}</div>
          <div class="cat-row-info">
            <div class="cat-row-name">${cat?.name||id}</div>
            <div class="cat-row-bar"><div class="cat-row-fill" style="width:${pct}%;background:${cat?.color||'#6c63ff'}"></div></div>
          </div>
          <div class="cat-row-pct">${pct}%</div>
          <div class="cat-row-amt">${fmt(amt)}</div>
        </div>`;
      }).join('')
    : `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">No expense data</div></div>`;
}

/* ======================== BUDGETS ======================== */
function renderBudgets() {
  const now = new Date();
  const m = now.getMonth(), y = now.getFullYear();
  const monthTxns = DB.txns.filter(t => {
    const d = new Date(t.date);
    return t.type==='expense' && d.getMonth()===m && d.getFullYear()===y;
  });

  if (!DB.budgets.length) {
    document.getElementById('budgetList').innerHTML =
      `<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-title">No Budgets Set</div><div class="empty-sub">Click "+ Add Budget" to set monthly limits for categories.</div></div>`;
    return;
  }

  document.getElementById('budgetList').innerHTML = DB.budgets.map((b, i) => {
    const cat = getCatById(b.category);
    const spent = monthTxns.filter(t=>t.category===b.category).reduce((s,t)=>s+t.amount,0);
    const pct   = Math.min(100, b.limit ? Math.round(spent/b.limit*100) : 0);
    const over  = spent > b.limit;
    const barColor = pct < 60 ? '#22c55e' : pct < 85 ? '#f59e0b' : '#ef4444';
    const statusTxt = over ? `⚠️ Over by ${fmt(spent-b.limit)}` : `${fmt(b.limit - spent)} remaining`;
    return `<div class="budget-card">
      <div class="budget-top">
        <div class="budget-cat">
          <span style="font-size:1.3rem">${cat?.icon||'📦'}</span> ${cat?.name||b.category}
        </div>
        <div class="budget-actions">
          <button class="btn-icon" onclick="deleteBudget(${i})">🗑</button>
        </div>
      </div>
      <div class="budget-amounts">Spent <b>${fmt(spent)}</b> of <b>${fmt(b.limit)}</b></div>
      <div class="budget-bar-bg"><div class="budget-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
      <div class="budget-status" style="color:${over?'var(--red)':'var(--text2)'}">${statusTxt} • ${pct}%</div>
    </div>`;
  }).join('');
}

function openBudgetModal() {
  const sel = document.getElementById('budgetCat');
  sel.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  document.getElementById('budgetAmount').value = '';
  document.getElementById('budgetCurSym').textContent = getCur();
  document.getElementById('budgetModalOverlay').classList.add('open');
}
function closeBudgetModal(e) {
  if (!e || e.target === document.getElementById('budgetModalOverlay'))
    document.getElementById('budgetModalOverlay').classList.remove('open');
}
function saveBudget() {
  const cat = document.getElementById('budgetCat').value;
  const limit = parseFloat(document.getElementById('budgetAmount').value);
  if (!limit || limit <= 0) { showToast('Enter a valid amount'); return; }
  const existing = DB.budgets.findIndex(b => b.category === cat);
  if (existing >= 0) DB.budgets[existing].limit = limit;
  else DB.budgets.push({ category: cat, limit });
  saveDB();
  closeBudgetModal();
  renderBudgets();
  showToast('Budget saved!');
}
function deleteBudget(i) {
  DB.budgets.splice(i, 1);
  saveDB();
  renderBudgets();
  showToast('Budget removed');
}

/* ======================== ACCOUNTS ======================== */
function renderAccounts() {
  const typeIcons = { bank:'🏦', cash:'💵', credit:'💳', wallet:'👛' };
  const typeLabels = { bank:'Bank Account', cash:'Cash', credit:'Credit Card', wallet:'Digital Wallet' };
  const totalBal = DB.accounts.reduce((s,a)=>s+a.balance,0);

  document.getElementById('accountsList').innerHTML = [
    `<div class="account-card" style="background:linear-gradient(135deg,var(--card),var(--card2));border-color:var(--border2)">
      <div class="account-type-icon">💎</div>
      <div class="account-name">Total Balance</div>
      <div class="account-type-label">All accounts combined</div>
      <div class="account-balance-label">Available Balance</div>
      <div class="account-balance" style="color:${totalBal>=0?'var(--green)':'var(--red)'}">${totalBal<0?'-':''}${fmt(totalBal)}</div>
    </div>`,
    ...DB.accounts.map((a, i) =>
      `<div class="account-card">
        <div class="account-type-icon">${typeIcons[a.type]||'🏦'}</div>
        <div class="account-name">${a.name}</div>
        <div class="account-type-label">${typeLabels[a.type]||'Account'}</div>
        <div class="account-balance-label">Balance</div>
        <div class="account-balance" style="color:${a.balance>=0?'var(--green)':'var(--red)'}">${a.balance<0?'-':''}${fmt(a.balance)}</div>
        <div class="account-actions">
          <button class="btn-icon" onclick="deleteAccount(${i})">🗑 Remove</button>
        </div>
      </div>`)
  ].join('');
}

function openAccountModal() {
  document.getElementById('accountName').value = '';
  document.getElementById('accountBalance').value = '';
  document.getElementById('acctCurSym').textContent = getCur();
  document.getElementById('accountModalOverlay').classList.add('open');
}
function closeAccountModal(e) {
  if (!e || e.target === document.getElementById('accountModalOverlay'))
    document.getElementById('accountModalOverlay').classList.remove('open');
}
function saveAccount() {
  const name = document.getElementById('accountName').value.trim();
  const type = document.getElementById('accountType').value;
  const bal  = parseFloat(document.getElementById('accountBalance').value) || 0;
  if (!name) { showToast('Enter account name'); return; }
  DB.accounts.push({ id: Date.now().toString(), name, type, balance: bal });
  saveDB();
  closeAccountModal();
  renderAccounts();
  populateAccountSelect();
  showToast('Account added!');
}
function deleteAccount(i) {
  if (DB.accounts.length <= 1) { showToast("Can't delete the last account"); return; }
  DB.accounts.splice(i, 1);
  saveDB();
  renderAccounts();
  populateAccountSelect();
  showToast('Account removed');
}

/* ======================== ADD TRANSACTION MODAL ======================== */
function openAddModal(txnId = null) {
  editTxnId = txnId;
  selectedCat = null;
  document.getElementById('addModalTitle').textContent = txnId ? 'Edit Transaction' : 'Add Transaction';
  setType('expense');
  setTxnDefaults();
  populateCatGrid();
  populateAccountSelect();
  document.getElementById('modalCurSym').textContent = getCur();

  if (txnId) {
    const t = DB.txns.find(x => x.id === txnId);
    if (t) {
      setType(t.type);
      document.getElementById('txnAmount').value  = t.amount;
      document.getElementById('txnDate').value    = t.date;
      document.getElementById('txnTime').value    = t.time || '';
      document.getElementById('txnNotes').value   = t.notes || '';
      document.getElementById('txnAccount').value = t.account || '';
      selectedCat = t.category;
      populateCatGrid();
    }
  }
  document.getElementById('addModalOverlay').classList.add('open');
}

function closeAddModal(e) {
  if (!e || e.target === document.getElementById('addModalOverlay'))
    document.getElementById('addModalOverlay').classList.remove('open');
}

function setType(type) {
  selectedType = type;
  ['expense','income','transfer'].forEach(t => {
    document.getElementById('type' + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('active', t === type);
  });
  const catGroup = document.getElementById('catGroup');
  catGroup.style.display = type === 'transfer' ? 'none' : 'block';
  if (type !== 'transfer') populateCatGrid();
}

function setTxnDefaults() {
  document.getElementById('txnAmount').value = '';
  document.getElementById('txnDate').value   = today();
  document.getElementById('txnTime').value   = nowTime();
  document.getElementById('txnNotes').value  = '';
}

function populateCatGrid() {
  const cats = selectedType === 'income' ? CATEGORIES.filter(c => INCOME_CATS.includes(c.id))
    : CATEGORIES.filter(c => !INCOME_CATS.includes(c.id) || c.id === 'others');
  document.getElementById('catGrid').innerHTML = cats.map(c =>
    `<div class="cat-chip ${selectedCat===c.id?'selected':''}" onclick="selectCat('${c.id}')">
      <span class="cat-chip-icon">${c.icon}</span>
      <span>${c.name.split(' ')[0]}</span>
    </div>`
  ).join('');
}

function selectCat(id) {
  selectedCat = id;
  populateCatGrid();
}

function populateAccountSelect() {
  const sel = document.getElementById('txnAccount');
  sel.innerHTML = DB.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
}

function saveTransaction() {
  const amount = parseFloat(document.getElementById('txnAmount').value);
  const date   = document.getElementById('txnDate').value;
  const time   = document.getElementById('txnTime').value;
  const notes  = document.getElementById('txnNotes').value.trim();
  const acct   = document.getElementById('txnAccount').value;

  if (!amount || amount <= 0) { showToast('Enter a valid amount'); return; }
  if (!date)   { showToast('Select a date'); return; }
  if (selectedType !== 'transfer' && !selectedCat) { showToast('Select a category'); return; }

  const cat = selectedType === 'transfer' ? 'transfer' : selectedCat;

  if (editTxnId) {
    // Edit existing
    const old = DB.txns.find(t => t.id === editTxnId);
    if (old) {
      // Reverse old account effect
      adjustAccountBalance(old.account, old.type, old.amount, true);
      old.amount   = amount;
      old.category = cat;
      old.date     = date;
      old.time     = time;
      old.notes    = notes;
      old.account  = acct;
      old.type     = selectedType;
      adjustAccountBalance(acct, selectedType, amount, false);
    }
    showToast('Transaction updated!');
  } else {
    const txn = { id: Date.now().toString(), type: selectedType, amount, category: cat, date, time, notes, account: acct };
    DB.txns.push(txn);
    adjustAccountBalance(acct, selectedType, amount, false);
    showToast('Transaction added!');
  }

  saveDB();
  closeAddModal();
  renderAll();
  editTxnId = null;
}

function editTransaction(id) {
  openAddModal(id);
}

function adjustAccountBalance(acctId, type, amount, reverse) {
  const a = DB.accounts.find(x => x.id === acctId);
  if (!a) return;
  const factor = reverse ? -1 : 1;
  if (type === 'income')   a.balance += amount * factor;
  if (type === 'expense')  a.balance -= amount * factor;
}

/* ======================== SETTINGS ======================== */
function loadSettings() {
  document.getElementById('settingName').value     = DB.settings.name || '';
  document.getElementById('settingCurrency').value = DB.settings.currency || '₹';
}

function saveSettings() {
  DB.settings.name     = document.getElementById('settingName').value.trim() || 'User';
  DB.settings.currency = document.getElementById('settingCurrency').value;
  saveDB();
  applySettings();
  showToast('Settings saved!');
}

function applySettings() {
  document.getElementById('sidebarName').textContent  = DB.settings.name || 'User';
  document.getElementById('sidebarAvatar').textContent = (DB.settings.name || 'U')[0].toUpperCase();
  document.getElementById('modalCurSym').textContent  = getCur();
  document.getElementById('budgetCurSym').textContent = getCur();
  document.getElementById('acctCurSym').textContent   = getCur();
  setGreeting();
}

/* ======================== IMPORT / EXPORT ======================== */
function exportData() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'finsight-backup.json';
  a.click();
  showToast('Data exported!');
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.txns && data.accounts) {
        DB = data;
        saveDB();
        renderAll();
        applySettings();
        showToast('Data imported!');
      } else showToast('Invalid file format');
    } catch { showToast('Invalid JSON file'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function exportCSV() {
  const rows = [['Date','Time','Type','Category','Amount','Account','Notes']];
  DB.txns.forEach(t => {
    rows.push([t.date, t.time||'', t.type, getCatById(t.category)?.name||t.category, t.amount, getAccountName(t.account)||'', t.notes||'']);
  });
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'finsight-transactions.csv';
  a.click();
  showToast('CSV exported!');
}

function clearAllData() {
  if (!confirm('⚠️ This will delete ALL your data. Are you sure?')) return;
  DB = freshDB();
  saveDB();
  renderAll();
  applySettings();
  showToast('All data cleared');
}

/* ======================== FILTERS POPULATION ======================== */
function populateCatFilter() {
  const sel = document.getElementById('txnCatFilter');
  sel.innerHTML = `<option value="all">All Categories</option>` +
    CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

function populateBudgetCatSelect() {
  const sel = document.getElementById('budgetCat');
  sel.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

/* ======================== HELPERS ======================== */
function getCatById(id) { return CATEGORIES.find(c => c.id === id); }
function getAccountName(id) { return DB.accounts.find(a => a.id === id)?.name || ''; }
function emptyState(title, sub = '') {
  return `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div></div>`;
}

/* ======================== TOAST ======================== */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
