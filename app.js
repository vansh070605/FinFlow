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

function getAllCategories() {
  return [...CATEGORIES, ...(DB.categories || [])];
}
function getIncomeCats() {
  return [...INCOME_CATS, ...(DB.incomeCats || [])];
}
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
let currentUser     = null;
let authTab         = 'login';

/* ======================== CHARTS ======================== */
let overviewChart   = null;
let categoryChart   = null;
let analysisTrendCh = null;
let analysisCatCh   = null;

/* ======================== DB HELPERS ======================== */
function loadDB() {
  try {
    const db = JSON.parse(localStorage.getItem('finsight_db')) || freshDB();
    if (!db.impulseVault) db.impulseVault = [];
    if (!db.stats) db.stats = { totalSaved: 0, savedCount: 0 };
    if (!db.settings) db.settings = { name: 'User', currency: '₹' };
    if (db.settings.hourlyWage === undefined) db.settings.hourlyWage = 0;
    if (db.settings.timeIsMoney === undefined) db.settings.timeIsMoney = false;
    if (db.settings.hideOnboarding === undefined) db.settings.hideOnboarding = false;
    if (!db.categories) db.categories = [];
    if (!db.incomeCats) db.incomeCats = [];
    return db;
  } catch { return freshDB(); }
}
function freshDB() {
  return {
    txns:     [],
    accounts: JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS)),
    budgets:  [],
    settings: { name: 'User', currency: '₹', hourlyWage: 0, timeIsMoney: false, hideOnboarding: false },
    impulseVault: [],
    stats: { totalSaved: 0, savedCount: 0 },
    categories: [],
    incomeCats: []
  };
}
function saveDB() {
  localStorage.setItem('finsight_db', JSON.stringify(DB));
  if (typeof auth !== 'undefined' && auth && typeof firestore !== 'undefined' && firestore && currentUser && currentUser !== 'guest') {
    firestore.collection('users').doc(currentUser.uid).set(DB)
      .catch(err => console.error("Firestore sync failed:", err));
  }
}

/* ======================== FIREBASE AUTH & SYNC ======================== */
function initAuth() {
  const warningEl = document.getElementById('firebase-warning');
  const authScreen = document.getElementById('auth-screen');
  
  if (typeof auth === 'undefined' || !auth || typeof firestore === 'undefined' || !firestore) {
    if (warningEl) warningEl.classList.remove('hidden');
    return;
  }
  
  if (warningEl) warningEl.classList.add('hidden');
  
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      
      // Update settings cloud sync display
      const authStatusEl = document.getElementById('settingsAuthStatus');
      const authBtnEl = document.getElementById('settingsAuthBtn');
      if (authStatusEl) {
        authStatusEl.innerHTML = `Connected as <b>${user.displayName || user.email}</b><br><span class="text-[10px] text-green-500 font-bold">Cloud Sync Active</span>`;
      }
      if (authBtnEl) {
        authBtnEl.textContent = 'Log Out';
        authBtnEl.className = "w-full bg-error-container/10 hover:bg-error-container/20 text-error hover:text-white border border-error/25 py-3 rounded-xl text-sm font-semibold active:scale-98 transition-all";
      }
      
      // Update display name in DB settings
      if (user.displayName) {
        DB.settings.name = user.displayName;
      }
      
      // Fetch data from Firestore
      try {
        const docRef = firestore.collection('users').doc(user.uid);
        const doc = await docRef.get();
        if (doc.exists) {
          const cloudData = doc.data();
          DB = cloudData;
          if (!DB.txns) DB.txns = [];
          if (!DB.accounts) DB.accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
          if (!DB.budgets) DB.budgets = [];
          if (!DB.settings) DB.settings = { name: user.displayName || 'User', currency: '₹' };
          if (!DB.impulseVault) DB.impulseVault = [];
          if (!DB.stats) DB.stats = { totalSaved: 0, savedCount: 0 };
          if (!DB.categories) DB.categories = [];
          if (!DB.incomeCats) DB.incomeCats = [];
          
          localStorage.setItem('finsight_db', JSON.stringify(DB));
        } else {
          // Cloud document doesn't exist, migrate current local DB to cloud
          await docRef.set(DB);
        }
      } catch (err) {
        console.error("Firestore loading error:", err);
      }
      
      // Hide auth overlay
      if (authScreen) {
        authScreen.classList.add('opacity-0', 'pointer-events-none');
        authScreen.classList.remove('opacity-100', 'pointer-events-auto');
      }
      
      // Re-initialize and render dashboard with the cloud DB
      applySettings();
      populateAccountSelect();
      populateCatFilter();
      populateCatGrid();
      setTxnDefaults();
      renderAll();
      setGreeting();
      startImpulseTimer();
      
    } else {
      currentUser = null;
      // Show auth screen overlay
      if (authScreen) {
        authScreen.classList.remove('opacity-0', 'pointer-events-none');
        authScreen.classList.add('opacity-100', 'pointer-events-auto');
      }
      
      // Update settings status
      const authStatusEl = document.getElementById('settingsAuthStatus');
      const authBtnEl = document.getElementById('settingsAuthBtn');
      if (authStatusEl) {
        authStatusEl.innerHTML = `Not signed in.<br><span class="text-[10px] opacity-70">Data saved locally only.</span>`;
      }
      if (authBtnEl) {
        authBtnEl.textContent = 'Sign In';
        authBtnEl.className = "w-full bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-container active:scale-98 transition-all shadow-md";
      }
    }
  });
}

function setAuthTab(tab) {
  authTab = tab;
  const loginBtn = document.getElementById('auth-tab-login');
  const signupBtn = document.getElementById('auth-tab-signup');
  const nameGroup = document.getElementById('auth-name-group');
  const btnText = document.getElementById('auth-btn-text');
  const btnIcon = document.getElementById('auth-btn-icon');
  
  if (tab === 'login') {
    if (loginBtn) loginBtn.className = "w-full py-2.5 rounded-xl text-xs font-bold transition-all bg-white dark:bg-slate-900 shadow-sm text-primary dark:text-secondary-container";
    if (signupBtn) signupBtn.className = "w-full py-2.5 rounded-xl text-xs font-bold transition-all text-on-surface-variant";
    if (nameGroup) nameGroup.classList.add('hidden');
    if (btnText) btnText.textContent = "Sign In";
    if (btnIcon) btnIcon.textContent = "login";
  } else {
    if (signupBtn) signupBtn.className = "w-full py-2.5 rounded-xl text-xs font-bold transition-all bg-white dark:bg-slate-900 shadow-sm text-primary dark:text-secondary-container";
    if (loginBtn) loginBtn.className = "w-full py-2.5 rounded-xl text-xs font-bold transition-all text-on-surface-variant";
    if (nameGroup) nameGroup.classList.remove('hidden');
    if (btnText) btnText.textContent = "Create Account";
    if (btnIcon) btnIcon.textContent = "person_add";
  }
}

function useAsGuest() {
  currentUser = 'guest';
  const authScreen = document.getElementById('auth-screen');
  if (authScreen) {
    authScreen.classList.add('opacity-0', 'pointer-events-none');
    authScreen.classList.remove('opacity-100', 'pointer-events-auto');
  }
  
  // Update settings status for Guest
  const authStatusEl = document.getElementById('settingsAuthStatus');
  const authBtnEl = document.getElementById('settingsAuthBtn');
  if (authStatusEl) {
    authStatusEl.innerHTML = `Guest Session (Offline Mode)<br><span class="text-[10px] opacity-70">Sign in to enable Cloud Sync.</span>`;
  }
  if (authBtnEl) {
    authBtnEl.textContent = 'Sign In / Connect';
    authBtnEl.className = "w-full bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-container active:scale-98 transition-all shadow-md";
  }
  
  // Render using local storage
  applySettings();
  populateAccountSelect();
  populateCatFilter();
  populateCatGrid();
  setTxnDefaults();
  renderAll();
  setGreeting();
  startImpulseTimer();
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  if (typeof auth === 'undefined' || !auth) {
    alert("Firebase is not initialized. Please run as guest.");
    return;
  }
  
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const submitBtn = document.getElementById('auth-submit-btn');
  
  if (submitBtn) submitBtn.disabled = true;
  
  try {
    if (authTab === 'login') {
      await auth.signInWithEmailAndPassword(email, password);
    } else {
      const name = document.getElementById('auth-name').value;
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      if (userCredential.user) {
        await userCredential.user.updateProfile({ displayName: name });
        DB.settings.name = name;
        saveDB();
      }
    }
  } catch (error) {
    console.error("Auth action failed:", error);
    alert(error.message);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleLogout() {
  if (currentUser === 'guest') {
    currentUser = null;
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
      authScreen.classList.remove('opacity-0', 'pointer-events-none');
      authScreen.classList.add('opacity-100', 'pointer-events-auto');
    }
    initAuth();
    return;
  }
  if (typeof auth === 'undefined' || !auth) return;
  try {
    await auth.signOut();
    window.location.reload();
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

function getCur() { return DB.settings.currency || '₹'; }
function fmt(n) {
  const absVal = Math.abs(n);
  if (DB.settings.timeIsMoney && DB.settings.hourlyWage > 0) {
    const hours = absVal / DB.settings.hourlyWage;
    if (hours === 0) return '0 hrs';
    if (hours < 1) {
      return Math.round(hours * 60) + 'm of life';
    } else {
      const h = Math.floor(hours);
      const m = Math.round((hours % 1) * 60);
      return `${h}h${m > 0 ? ` ${m}m` : ''} of life`;
    }
  }
  return getCur() + absVal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

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

/* ======================== MODALS MULTIPLEXER ======================== */
function toggleModal(overlayId, modalId, show) {
  const overlay = document.getElementById(overlayId);
  const modal = document.getElementById(modalId);
  if (!overlay || !modal) return;
  if (show) {
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    overlay.classList.add('opacity-100', 'pointer-events-auto');
    modal.classList.remove('scale-95');
    modal.classList.add('scale-100');
  } else {
    overlay.classList.remove('opacity-100', 'pointer-events-auto');
    overlay.classList.add('opacity-0', 'pointer-events-none');
    modal.classList.remove('scale-100');
    modal.classList.add('scale-95');
  }
}

/* ======================== INIT ======================== */
document.addEventListener('DOMContentLoaded', () => {
  // Sync system class for dark theme first
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.className = theme;
  updateThemeUI();

  applySettings();
  populateCatFilter();
  populateCatGrid();
  populateAccountSelect();
  setTxnDefaults();
  renderAll();
  setGreeting();
  registerSW();
  startImpulseTimer();
  showPage('dashboard'); // Initial view configuration

  // Desktop-only mouse-tracking radial glow for glass cards
  if (window.innerWidth >= 1024) {
    document.addEventListener('mousemove', e => {
      document.querySelectorAll('.glass').forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }

  // Initialize Authentication and Cloud Sync
  initAuth();
});

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

/* ======================== PAGE NAVIGATION ======================== */
function showPage(pageId, el) {
  // Hide all sections
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const targetPage = document.getElementById('page-' + pageId);
  if (targetPage) targetPage.classList.remove('hidden');

  // Reset active classes on all nav options
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('bg-primary', 'text-white', 'dark:bg-primary-container', 'dark:text-on-primary-container', 'bg-primary/10', 'bg-white/10', 'text-primary', 'font-bold');
    n.classList.add('text-on-surface-variant');
  });
  document.querySelectorAll('.bn-item').forEach(n => {
    n.classList.remove('text-primary', 'dark:text-secondary-container', 'text-tertiary', 'bg-tertiary/10', 'rounded-xl', 'px-4', 'py-1', 'scale-110');
    n.classList.add('text-on-surface-variant');
  });

  // Highlight current nav links in sidebar and bottom navigation
  document.querySelectorAll(`[data-page="${pageId}"]`).forEach(n => {
    if (n.classList.contains('nav-item')) {
      n.classList.remove('text-on-surface-variant');
      n.classList.add('bg-primary/10', 'text-primary', 'font-bold');
    } else if (n.classList.contains('bn-item')) {
      n.classList.remove('text-on-surface-variant');
      n.classList.add('text-tertiary', 'bg-tertiary/10', 'rounded-xl', 'px-4', 'py-1', 'scale-110');
    }
  });

  // Trigger individual page rendering scripts
  if (pageId === 'dashboard')    renderDashboard();
  if (pageId === 'transactions') renderTransactions();
  if (pageId === 'analysis')     renderAnalysis();
  if (pageId === 'smartsave')    renderSmartSave();
  if (pageId === 'budgets')      renderBudgets();
  if (pageId === 'accounts')     renderAccounts();
  if (pageId === 'settings')     loadSettings();

  return false;
}

function renderAll() {
  renderDashboard();
  renderTransactions();
  renderAnalysis();
  renderSmartSave();
  renderBudgets();
  renderAccounts();
  syncAllTabs();
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
  syncAllTabs();
  renderDashboard();
}

function renderDashboard() {
  const txns = filterTxns(DB.txns, dashPeriod);
  const spent  = txns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const income = txns.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const bal    = income - spent;
  const subMap = { week: 'This week', month: 'This month', year: 'This year' };

  const spentEl = document.getElementById('dashSpent');
  if (spentEl) spentEl.textContent = fmt(spent);

  const incomeEl = document.getElementById('dashIncome');
  if (incomeEl) incomeEl.textContent = fmt(income);

  const balanceEl = document.getElementById('dashBalance');
  if (balanceEl) {
    balanceEl.textContent = (bal >= 0 ? '' : '-') + fmt(bal);
    balanceEl.className = 'text-3xl md:text-4xl font-headline font-extrabold transition-all duration-300 ' + 
      (bal >= 0 ? 'text-on-surface' : 'text-error');
  }

  const txnCountEl = document.getElementById('dashTxnCount');
  if (txnCountEl) txnCountEl.textContent = txns.length;

  const spentSubEl = document.getElementById('dashSpentSub');
  if (spentSubEl) spentSubEl.textContent = subMap[dashPeriod];

  const incomeSubEl = document.getElementById('dashIncomeSub');
  if (incomeSubEl) incomeSubEl.textContent = subMap[dashPeriod];

  const txnSubEl = document.getElementById('dashTxnSub');
  if (txnSubEl) txnSubEl.textContent = subMap[dashPeriod];

  renderOverviewChart(txns);
  renderCategoryDoughnut(txns, 'categoryChart');

  // Recent 5
  const recent = [...DB.txns].sort((a,b) => new Date(b.date+' '+b.time) - new Date(a.date+' '+a.time)).slice(0, 5);
  const recentListEl = document.getElementById('dashRecentList');
  if (recentListEl) {
    recentListEl.innerHTML = recent.length
      ? recent.map(t => txnItemHTML(t)).join('')
      : emptyState('No transactions yet', 'Add your first transaction!');
  }

  // Onboarding Banner
  const onboardingBanner = document.getElementById('onboarding-banner');
  if (onboardingBanner) {
    if (DB.settings.hideOnboarding) {
      onboardingBanner.classList.add('hidden');
    } else {
      onboardingBanner.classList.remove('hidden');
      const userSpan = document.getElementById('onboarding-username');
      if (userSpan) {
        userSpan.textContent = DB.settings.name || 'User';
      }
    }
  }
}

function renderOverviewChart(txns) {
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

  const canvas = document.getElementById('overviewChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (overviewChart) overviewChart.destroy();
  
  const isDark = document.documentElement.classList.contains('dark');
  const expenseColor = isDark ? '#ffb4ab' : '#ba1a1a';
  const incomeColor = isDark ? '#00e475' : '#007f3e';

  overviewChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Expense', data: expData, backgroundColor: expenseColor, borderRadius: 6, borderSkipped: false },
        { label: 'Income',  data: incData, backgroundColor: incomeColor, borderRadius: 6, borderSkipped: false },
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

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (canvasId === 'categoryChart' && categoryChart) categoryChart.destroy();
  if (canvasId === 'analysisCatChart' && analysisCatCh) analysisCatCh.destroy();

  const isDark = document.documentElement.classList.contains('dark');
  const chartBorderColor = isDark ? '#10131a' : '#ffffff';
  const textColor = isDark ? '#94a3b8' : '#475569';

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: { 
      labels, 
      datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: chartBorderColor, hoverOffset: 8 }] 
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'right', 
          labels: { 
            color: textColor, 
            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }, 
            padding: 12, 
            usePointStyle: true, 
            pointStyleWidth: 10 
          } 
        },
        tooltip: { callbacks: { label: (c) => ` ${c.label}: ${getCur()}${c.raw.toLocaleString('en-IN')}` } }
      }
    }
  });
  if (canvasId === 'categoryChart')  categoryChart  = chart;
  if (canvasId === 'analysisCatChart') analysisCatCh = chart;
}

function chartOpts() {
  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#94a3b8' : '#475569';
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' }, usePointStyle: true } },
      tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${getCur()}${c.raw.toLocaleString('en-IN')}` } }
    },
    scales: {
      x: { ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }, grid: { color: gridColor } },
      y: { ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 10 }, callback: v => getCur() + v.toLocaleString('en-IN') }, grid: { color: gridColor } }
    }
  };
}

/* ======================== TRANSACTIONS ======================== */
let txnCustomFrom = '', txnCustomTo = '';

function setTxnPeriod(p, el) {
  txnPeriod = p;
  syncAllTabs();
  document.getElementById('customDateRange').classList.toggle('hidden', p !== 'custom');
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
  
  document.getElementById('txnSummaryBar').innerHTML = `
    <div class="flex flex-col items-center">
      <span class="text-[10px] uppercase font-bold text-on-surface-variant dark:text-gray-400">Expense</span>
      <span class="font-headline font-bold text-sm text-tertiary dark:text-red-400">${fmt(spent)}</span>
    </div>
    <div class="w-px h-6 bg-outline-variant/30 dark:bg-outline/10"></div>
    <div class="flex flex-col items-center">
      <span class="text-[10px] uppercase font-bold text-on-surface-variant dark:text-gray-400">Income</span>
      <span class="font-headline font-bold text-sm text-secondary dark:text-green-400">${fmt(income)}</span>
    </div>
    <div class="w-px h-6 bg-outline-variant/30 dark:bg-outline/10"></div>
    <div class="flex flex-col items-center">
      <span class="text-[10px] uppercase font-bold text-on-surface-variant dark:text-gray-400">Net</span>
      <span class="font-headline font-bold text-sm ${net >= 0 ? 'text-secondary dark:text-green-400' : 'text-tertiary dark:text-red-400'}">${net < 0 ? '-' : ''}${fmt(net)}</span>
    </div>
    <div class="w-px h-6 bg-outline-variant/30 dark:bg-outline/10"></div>
    <div class="flex flex-col items-center">
      <span class="text-[10px] uppercase font-bold text-on-surface-variant dark:text-gray-400">Records</span>
      <span class="font-headline font-bold text-sm text-on-surface dark:text-white">${txns.length}</span>
    </div>
  `;

function formatTxnDateHeader(dateStr) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  
  const d = new Date(dateStr + 'T00:00:00');
  const dayNum = d.getDate();
  const monthName = d.toLocaleDateString('en-IN', { month: 'short' }).toLowerCase();
  
  let dayPrefix = '';
  if (dateStr === todayStr) {
    dayPrefix = 'today';
  } else if (dateStr === yesterdayStr) {
    dayPrefix = 'yesterday';
  } else {
    dayPrefix = d.toLocaleDateString('en-IN', { weekday: 'long' }).toLowerCase();
  }
  
  return `${dayPrefix}, ${dayNum} ${monthName}`;
}

  // Group by date
  const sorted = [...txns].sort((a,b) => new Date(b.date+' '+b.time) - new Date(a.date+' '+a.time));
  const groups = {};
  sorted.forEach(t => {
    (groups[t.date] = groups[t.date] || []).push(t);
  });

  const html = Object.keys(groups).sort((a,b)=>b.localeCompare(a)).map(date => {
    const dayTxns = groups[date];
    return `
      <div class="space-y-2">
        <div class="text-[11px] font-bold italic tracking-wider text-on-surface-variant/80 px-1 pt-2 lowercase">${formatTxnDateHeader(date)}</div>
        <div class="space-y-2">${dayTxns.map(t => txnItemHTML(t, true)).join('')}</div>
      </div>
    `;
  }).join('');

  document.getElementById('txnFullList').innerHTML = html || emptyState('No Transactions', 'Change filters or add a transaction');
}

function txnItemHTML(t, showDelete = false) {
  const cat = getCatById(t.category);
  const isExp = t.type === 'expense';
  const isInc = t.type === 'income';
  const colorClass = isExp ? 'text-error' : isInc ? 'text-tertiary' : 'text-primary';
  const sign = isExp ? '-' : isInc ? '+' : '↔';
  
  const badgeCls = isExp 
    ? 'bg-error/10 text-error border-error/20' 
    : isInc 
      ? 'bg-tertiary/10 text-tertiary border-tertiary/20' 
      : 'bg-primary/10 text-primary border-primary/20';
  const badgeText = isExp ? 'cleared' : isInc ? 'received' : 'transfer';

  return `
    <div class="glass glass-hover flex items-center justify-between p-4 rounded-2xl cursor-pointer border border-outline-variant/10 dark:border-white/5 group relative" onclick="editTransaction('${t.id}')">
      <div class="flex items-center gap-3 relative z-10">
        <div class="w-10 h-10 rounded-xl bg-surface-container-high dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-all duration-350">
          ${cat?.icon || '📦'}
        </div>
        <div class="overflow-hidden">
          <div class="font-body font-bold text-sm text-on-surface truncate">${cat?.name || t.category}</div>
          <div class="font-body text-xs text-on-surface-variant truncate max-w-[120px] md:max-w-[300px]">
            ${t.notes || getAccountName(t.account) || 'No notes'}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-3 relative z-10">
        <div class="flex flex-col items-end">
          <span class="font-headline font-bold text-sm ${colorClass}">
            ${sign}${fmt(t.amount)}
          </span>
          <span class="text-[10px] text-on-surface-variant font-body">${t.time || ''}</span>
        </div>
        <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${badgeCls} lowercase">
          ${badgeText}
        </span>
      </div>
    </div>
  `;
}

/* ======================== ANALYSIS ======================== */
function setAnalysisPeriod(p, el) {
  analysisPeriod = p;
  analysisOffset = 0;
  syncAllTabs();
  document.getElementById('analysisCustomDate').classList.toggle('hidden', p !== 'custom');
  renderAnalysis();
}

function renderAnalysis() {
  let txns;

  if (analysisPeriod === 'custom') {
    const f = document.getElementById('analysisFrom').value;
    const t = document.getElementById('analysisTo').value;
    txns = filterTxns(DB.txns, 'custom', 0, f, t);
    document.getElementById('analysisNav').innerHTML = '';
  } else {
    txns = filterTxns(DB.txns, analysisPeriod, analysisOffset);
    const label = periodLabel(analysisPeriod, analysisOffset);
    document.getElementById('analysisNav').innerHTML = `
      <div class="flex items-center gap-4 bg-white dark:bg-slate-900 border border-outline-variant/20 dark:border-outline/10 p-1.5 rounded-xl shadow-sm w-full justify-between">
        <button onclick="analysisShift(-1)" class="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-white hover:bg-surface-container dark:hover:bg-slate-700 transition-colors font-bold">‹</button>
        <span class="font-headline font-bold text-sm text-on-surface dark:text-white">${label}</span>
        <button onclick="analysisShift(1)" ${analysisOffset >= 0 ? 'disabled' : ''} class="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-white hover:bg-surface-container dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors font-bold">›</button>
      </div>
    `;
  }

  const spent  = txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount, 0);
  const income = txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount, 0);
  const net    = income - spent;
  const count  = txns.length;

  document.getElementById('analysisCards').innerHTML = `
    <div class="glass glass-hover p-4 rounded-2xl shadow-sm border border-outline-variant/20 dark:border-white/10 space-y-1">
      <div class="text-[10px] font-bold uppercase text-on-surface-variant">Total Spent</div>
      <div class="text-lg lg:text-xl font-headline font-bold text-error">${fmt(spent)}</div>
    </div>
    <div class="glass glass-hover p-4 rounded-2xl shadow-sm border border-outline-variant/20 dark:border-white/10 space-y-1">
      <div class="text-[10px] font-bold uppercase text-on-surface-variant">Total Income</div>
      <div class="text-lg lg:text-xl font-headline font-bold text-tertiary">${fmt(income)}</div>
    </div>
    <div class="glass glass-hover p-4 rounded-2xl shadow-sm border border-outline-variant/20 dark:border-white/10 space-y-1">
      <div class="text-[10px] font-bold uppercase text-on-surface-variant">Net Balance</div>
      <div class="text-lg lg:text-xl font-headline font-bold ${net >= 0 ? 'text-tertiary' : 'text-error'}">${net < 0 ? '-' : ''}${fmt(net)}</div>
    </div>
    <div class="glass glass-hover p-4 rounded-2xl shadow-sm border border-outline-variant/20 dark:border-white/10 space-y-1">
      <div class="text-[10px] font-bold uppercase text-on-surface-variant">Transactions</div>
      <div class="text-lg lg:text-xl font-headline font-bold text-primary">${count}</div>
    </div>
  `;

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

  const canvas = document.getElementById('analysisTrendChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (analysisTrendCh) analysisTrendCh.destroy();
  
  const isDark = document.documentElement.classList.contains('dark');
  const expenseColor = isDark ? '#ffb4ab' : '#ba1a1a';
  const incomeColor = isDark ? '#00e475' : '#007f3e';
  const expenseBg = isDark ? 'rgba(255, 180, 171, 0.08)' : 'rgba(186, 26, 26, 0.06)';
  const incomeBg = isDark ? 'rgba(0, 228, 117, 0.08)' : 'rgba(0, 127, 62, 0.06)';

  analysisTrendCh = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'Expense', data: expData, borderColor: expenseColor, backgroundColor: expenseBg, fill:true, tension:.4, pointRadius:3 },
        { label:'Income',  data: incData, borderColor: incomeColor, backgroundColor: incomeBg,  fill:true, tension:.4, pointRadius:3 },
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
        const catColor = cat?.color || '#3525cd';
        
        return `
          <div class="glass flex items-center justify-between gap-4 p-4 rounded-2xl border border-outline-variant/10 dark:border-white/5 relative z-10">
            <div class="w-10 h-10 rounded-xl bg-surface-container-high dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 flex items-center justify-center text-lg shadow-sm" style="color: ${catColor};">
              ${cat?.icon || '📦'}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center mb-1 text-xs font-bold text-on-surface">
                <span class="truncate">${cat?.name || id}</span>
                <span>${pct}%</span>
              </div>
              <div class="w-full h-2 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500" style="width: ${pct}%; background-color: ${catColor};"></div>
              </div>
            </div>
            <div class="font-headline font-bold text-sm text-on-surface">
              ${fmt(amt)}
            </div>
          </div>
        `;
      }).join('')
    : emptyState('No expense data', 'Try adding some expenses first!');
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
    document.getElementById('budgetList').innerHTML = emptyState('No Budgets Set', 'Click "+ Set Budget" to set monthly limits for categories.');
    return;
  }

  document.getElementById('budgetList').innerHTML = DB.budgets.map((b, i) => {
    const cat = getCatById(b.category);
    const spent = monthTxns.filter(t=>t.category===b.category).reduce((s,t)=>s+t.amount,0);
    const pct   = Math.min(100, b.limit ? Math.round(spent/b.limit*100) : 0);
    const over  = spent > b.limit;
    const barBg = pct < 60 ? 'bg-tertiary' : pct < 85 ? 'bg-secondary' : 'bg-error';
    const statusTxt = over ? `⚠️ Over by ${fmt(spent-b.limit)}` : `${fmt(b.limit - spent)} remaining`;
    const statusColor = over ? 'text-error font-bold' : 'text-on-surface-variant';
    const catColor = cat?.color || '#3525cd';
    
    return `
      <div class="glass p-5 rounded-3xl border border-outline-variant/15 flex flex-col justify-between space-y-4">
        <div class="flex justify-between items-center relative z-10">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-container-high dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 flex items-center justify-center text-lg shadow-sm" style="color: ${catColor};">
              ${cat?.icon || '📦'}
            </div>
            <span class="font-body font-bold text-sm text-on-surface">${cat?.name || b.category}</span>
          </div>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-on-surface-variant hover:text-on-surface border border-black/10 dark:border-white/10 transition-colors" onclick="deleteBudget(${i})" title="Remove Budget">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
        
        <div class="space-y-2 relative z-10">
          <div class="flex justify-between items-end text-xs">
            <span class="text-on-surface-variant font-medium">Spent <b class="text-on-surface font-bold">${fmt(spent)}</b></span>
            <span class="text-on-surface-variant font-medium">Limit <b class="text-on-surface font-bold">${fmt(b.limit)}</b></span>
          </div>
          <div class="w-full h-2 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500 ${barBg}" style="width: ${pct}%;"></div>
          </div>
          <div class="flex justify-between items-center text-[10px] ${statusColor}">
            <span>${statusTxt}</span>
            <span>${pct}% used</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openBudgetModal() {
  const sel = document.getElementById('budgetCat');
  sel.innerHTML = getAllCategories().map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  document.getElementById('budgetAmount').value = '';
  document.getElementById('budgetCurSym').textContent = getCur();
  toggleModal('budgetModalOverlay', 'budgetModal', true);
}
function closeBudgetModal(e) {
  if (!e || e.target === document.getElementById('budgetModalOverlay'))
    toggleModal('budgetModalOverlay', 'budgetModal', false);
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

  const totalCard = `
    <div class="relative overflow-hidden glass p-6 rounded-3xl shadow-xl flex flex-col justify-between h-48 border border-outline-variant/15 dark:border-white/10 group">
      <div class="absolute -right-10 -bottom-10 w-36 h-36 bg-primary/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500"></div>
      <div class="flex justify-between items-start relative z-10">
        <div>
          <div class="text-[10px] uppercase font-bold text-primary tracking-wider">Total Balance</div>
          <div class="text-xs text-on-surface-variant mt-0.5">All accounts combined</div>
        </div>
        <span class="text-2xl">💎</span>
      </div>
      <div class="space-y-1 relative z-10">
        <div class="text-[10px] text-on-surface-variant font-semibold uppercase">Available Funds</div>
        <div class="text-3xl font-headline font-bold ${totalBal >= 0 ? 'text-tertiary' : 'text-error'}">
          ${totalBal < 0 ? '-' : ''}${fmt(totalBal)}
        </div>
      </div>
    </div>
  `;

  const cardsHtml = DB.accounts.map((a, i) => {
    let innerGlow = '';
    let glowBg = '';
    if (a.type === 'bank') {
      innerGlow = 'bg-blue-500/10 text-blue-400';
      glowBg = 'bg-blue-500';
    } else if (a.type === 'cash') {
      innerGlow = 'bg-tertiary/10 text-tertiary';
      glowBg = 'bg-tertiary';
    } else if (a.type === 'credit') {
      innerGlow = 'bg-error/10 text-error';
      glowBg = 'bg-error';
    } else if (a.type === 'wallet') {
      innerGlow = 'bg-secondary/10 text-secondary';
      glowBg = 'bg-secondary';
    } else {
      innerGlow = 'bg-primary/10 text-primary';
      glowBg = 'bg-primary';
    }

    return `
      <div class="relative overflow-hidden glass glass-hover p-6 rounded-3xl shadow-lg flex flex-col justify-between h-48 border border-outline-variant/15 dark:border-white/10 group">
        <div class="absolute -right-10 -bottom-10 w-36 h-36 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500 opacity-20 ${glowBg}"></div>
        
        <div class="flex justify-between items-start relative z-10">
          <div>
            <div class="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">${typeLabels[a.type] || 'Account'}</div>
            <div class="font-body font-bold text-base mt-0.5 text-on-surface">${a.name}</div>
          </div>
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg ${innerGlow}">
            ${typeIcons[a.type] || '🏦'}
          </div>
        </div>
        
        <div class="flex justify-between items-end relative z-10 mt-auto">
          <div class="space-y-1">
            <div class="text-[10px] text-on-surface-variant font-semibold uppercase">Balance</div>
            <div class="text-2xl font-headline font-bold ${a.balance >= 0 ? 'text-tertiary' : 'text-error'}">
              ${a.balance < 0 ? '-' : ''}${fmt(a.balance)}
            </div>
          </div>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-on-surface-variant hover:text-on-surface border border-black/10 dark:border-white/10 transition-colors" onclick="deleteAccount(${i})" title="Remove Account">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    `;
  });

  document.getElementById('accountsList').innerHTML = [totalCard, ...cardsHtml].join('');
}

function openAccountModal() {
  document.getElementById('accountName').value = '';
  document.getElementById('accountBalance').value = '';
  document.getElementById('acctCurSym').textContent = getCur();
  toggleModal('accountModalOverlay', 'accountModal', true);
}
function closeAccountModal(e) {
  if (!e || e.target === document.getElementById('accountModalOverlay'))
    toggleModal('accountModalOverlay', 'accountModal', false);
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
function openAddModal(modeOrTxnId = null) {
  editTxnId = null;
  selectedCat = null;
  
  let defaultType = 'expense';
  
  if (modeOrTxnId === 'expense' || modeOrTxnId === 'income' || modeOrTxnId === 'transfer') {
    defaultType = modeOrTxnId;
    document.getElementById('addModalTitle').textContent = 'Add Transaction';
    setTxnDefaults();
  } else if (modeOrTxnId) {
    editTxnId = modeOrTxnId;
    document.getElementById('addModalTitle').textContent = 'Edit Transaction';
  } else {
    document.getElementById('addModalTitle').textContent = 'Add Transaction';
    setTxnDefaults();
  }

  setType(defaultType);
  populateCatGrid();
  populateAccountSelect();
  document.getElementById('modalCurSym').textContent = getCur();

  if (editTxnId) {
    const t = DB.txns.find(x => x.id === editTxnId);
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
  toggleModal('addModalOverlay', 'addModal', true);
}

function closeAddModal(e) {
  if (!e || e.target === document.getElementById('addModalOverlay'))
    toggleModal('addModalOverlay', 'addModal', false);
}

function setType(type) {
  selectedType = type;
  ['expense','income','transfer'].forEach(t => {
    const el = document.getElementById('type' + t.charAt(0).toUpperCase() + t.slice(1));
    if (el) {
      if (t === type) {
        el.classList.remove('text-on-surface-variant', 'dark:text-gray-400');
        el.classList.add('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-primary', 'dark:text-secondary-container');
      } else {
        el.classList.remove('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-primary', 'dark:text-secondary-container');
        el.classList.add('text-on-surface-variant', 'dark:text-gray-400');
      }
    }
  });
  const catGroup = document.getElementById('catGroup');
  if (type === 'transfer') {
    catGroup.classList.add('hidden');
  } else {
    catGroup.classList.remove('hidden');
  }
  if (type !== 'transfer') populateCatGrid();
}

function setTxnDefaults() {
  document.getElementById('txnAmount').value = '';
  document.getElementById('txnDate').value   = today();
  document.getElementById('txnTime').value   = nowTime();
  document.getElementById('txnNotes').value  = '';
}

function populateCatGrid() {
  const cats = selectedType === 'income' ? getAllCategories().filter(c => getIncomeCats().includes(c.id))
    : getAllCategories().filter(c => !getIncomeCats().includes(c.id) || c.id === 'others');
  
  document.getElementById('catGrid').innerHTML = cats.map(c => {
    const isSelected = selectedCat === c.id;
    const borderCls = isSelected 
      ? 'border-2 border-primary dark:border-primary-container bg-primary/10 dark:bg-primary-container/20 text-primary dark:text-secondary-container font-bold scale-98 shadow-inner' 
      : 'border border-outline-variant/10 bg-white dark:bg-slate-900/60 text-on-surface-variant dark:text-gray-300';
      
    return `
      <div class="flex flex-col items-center justify-center p-2 rounded-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all ${borderCls}" onclick="selectCat('${c.id}')">
        <span class="text-xl mb-1">${c.icon}</span>
        <span class="text-[10px] truncate w-full text-center">${c.name.split(' ')[0]}</span>
      </div>
    `;
  }).join('') + `
    <div class="flex flex-col items-center justify-center p-2 rounded-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all border border-dashed border-outline-variant/30 bg-black/5 dark:bg-white/5 text-on-surface-variant dark:text-gray-300" onclick="openCreateCategoryModal()">
      <span class="text-xl mb-1">➕</span>
      <span class="text-[10px] truncate w-full text-center">New</span>
    </div>
  `;
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
    const old = DB.txns.find(t => t.id === editTxnId);
    if (old) {
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
  document.getElementById('settingWage').value     = DB.settings.hourlyWage || '';
  document.getElementById('settingTimeIsMoney').checked = DB.settings.timeIsMoney || false;
}

function saveSettings() {
  DB.settings.name       = document.getElementById('settingName').value.trim() || 'User';
  DB.settings.currency   = document.getElementById('settingCurrency').value;
  DB.settings.hourlyWage = parseFloat(document.getElementById('settingWage').value) || 0;
  DB.settings.timeIsMoney = document.getElementById('settingTimeIsMoney').checked;
  saveDB();
  applySettings();
  renderAll();
  showToast('Settings saved!');
}

function applySettings() {
  document.getElementById('sidebarName').textContent  = DB.settings.name || 'User';
  document.getElementById('sidebarAvatar').textContent = (DB.settings.name || 'U')[0].toUpperCase();
  document.getElementById('modalCurSym').textContent  = getCur();
  document.getElementById('budgetCurSym').textContent = getCur();
  document.getElementById('acctCurSym').textContent   = getCur();
  document.getElementById('settingsWageCurSym').textContent = getCur();
  document.getElementById('impulseCurSym').textContent = getCur();
  setGreeting();
}

function toggleTimeIsMoney() {
  DB.settings.timeIsMoney = document.getElementById('settingTimeIsMoney').checked;
  saveDB();
  renderAll();
  showToast(DB.settings.timeIsMoney ? 'Time is Money Mode Active! ⏳' : 'Currency Mode Active! 💵');
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
    getAllCategories().map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

function populateBudgetCatSelect() {
  const sel = document.getElementById('budgetCat');
  sel.innerHTML = getAllCategories().map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

/* ======================== HELPERS ======================== */
function getCatById(id) { return getAllCategories().find(c => c.id === id); }
function getAccountName(id) { return DB.accounts.find(a => a.id === id)?.name || ''; }

function emptyState(title, sub = '') {
  return `
    <div class="flex flex-col items-center justify-center p-8 text-center bg-surface-container-low dark:bg-slate-900/40 rounded-3xl border border-outline-variant/10 max-w-sm mx-auto my-4 space-y-2">
      <div class="text-4xl">📭</div>
      <div class="font-body font-bold text-sm text-on-surface dark:text-white">${title}</div>
      <div class="font-body text-xs text-on-surface-variant dark:text-gray-400">${sub}</div>
    </div>
  `;
}

/* ======================== TOAST ======================== */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  
  // Transition using bottom-sliding Tailwind classes
  t.classList.remove('opacity-0', 'translate-y-4');
  t.classList.add('opacity-100', 'translate-y-0');
  
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('opacity-100', 'translate-y-0');
    t.classList.add('opacity-0', 'translate-y-4');
  }, 2800);
}

/* ======================== INTERACTIVE ONBOARDING TOUR ======================== */
const TOUR_SLIDES = [
  {
    title: "Financial Dashboard 📊",
    icon: "dashboard",
    color: "text-primary",
    description: "Get a bird's eye view of your cash flow. Track Net Balance, Spent, and Income summaries across Weekly, Monthly, or Yearly windows. Keep tabs on recent transactions at a glance."
  },
  {
    title: "Real-Time Cloud Sync ☁️",
    icon: "cloud_sync",
    color: "text-secondary",
    description: "Your financial logs sync securely to Google Cloud. Log in with your email/password to keep your dashboard updated across all your devices seamlessly. (Or choose offline Guest mode anytime!)"
  },
  {
    title: "Time-is-Money Mode ⏳",
    icon: "hourglass_empty",
    color: "text-tertiary",
    description: "Set your Hourly Wage in Settings and toggle Time-is-Money mode. See costs converted into the exact hours of labor they represent. Ask yourself: 'Is this subscription really worth 5 hours of work?'"
  },
  {
    title: "Smart Save Vault 🧠",
    icon: "lock_open",
    color: "text-error",
    description: "Cool down impulse buys by locking them in a virtual vault for 24 to 72 hours. We calculate what that money would grow to in the future if saved, giving your brain the cooling time it needs to resist!"
  }
];

let tourIndex = 0;

function startInteractiveTour() {
  tourIndex = 0;
  renderTourSlide();
  toggleModal('tourModalOverlay', 'tourModal', true);
}

function closeTourModal(e) {
  if (!e || e.target === document.getElementById('tourModalOverlay') || e.target.classList.contains('material-symbols-outlined') || e.target.closest('button')) {
    toggleModal('tourModalOverlay', 'tourModal', false);
  }
}

function renderTourSlide() {
  const slide = TOUR_SLIDES[tourIndex];
  const container = document.getElementById('tourSlidesContainer');
  const dotsContainer = document.getElementById('tourDots');
  const prevBtn = document.getElementById('tourPrevBtn');
  const nextBtn = document.getElementById('tourNextBtn');
  
  if (!container || !slide) return;
  
  // Render slide body with animations
  container.innerHTML = `
    <div class="flex flex-col items-center text-center space-y-4 animate-fadeIn py-4">
      <div class="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center border border-outline-variant/15 dark:border-white/10 shadow-inner">
        <span class="material-symbols-outlined text-3xl ${slide.color}">${slide.icon}</span>
      </div>
      <h4 class="font-headline text-xl font-extrabold text-on-surface">${slide.title}</h4>
      <p class="font-body text-xs text-on-surface-variant leading-relaxed max-w-sm">
        ${slide.description}
      </p>
    </div>
  `;
  
  // Render Dots
  if (dotsContainer) {
    dotsContainer.innerHTML = TOUR_SLIDES.map((_, idx) => `
      <div class="w-2 h-2 rounded-full transition-all duration-300 ${idx === tourIndex ? 'w-6 bg-primary' : 'bg-outline-variant/40 dark:bg-white/20'}"></div>
    `).join('');
  }
  
  // Configure Buttons
  if (prevBtn) {
    if (tourIndex === 0) {
      prevBtn.classList.add('opacity-40', 'pointer-events-none');
    } else {
      prevBtn.classList.remove('opacity-40', 'pointer-events-none');
    }
  }
  
  if (nextBtn) {
    if (tourIndex === TOUR_SLIDES.length - 1) {
      nextBtn.textContent = 'Finish';
      nextBtn.classList.remove('bg-primary');
      nextBtn.classList.add('bg-secondary');
    } else {
      nextBtn.textContent = 'Next';
      nextBtn.classList.remove('bg-secondary');
      nextBtn.classList.add('bg-primary');
    }
  }
}

function nextTourSlide() {
  if (tourIndex < TOUR_SLIDES.length - 1) {
    tourIndex++;
    renderTourSlide();
  } else {
    // Finish Tour
    toggleModal('tourModalOverlay', 'tourModal', false);
    dismissOnboarding();
  }
}

function prevTourSlide() {
  if (tourIndex > 0) {
    tourIndex--;
    renderTourSlide();
  }
}

function dismissOnboarding() {
  const banner = document.getElementById('onboarding-banner');
  if (banner) {
    banner.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
      banner.classList.add('hidden');
      DB.settings.hideOnboarding = true;
      saveDB();
    }, 300);
  }
}

/* ======================== SMART SAVE LOGIC ======================== */
function calculateHoursOfWork(amount) {
  const wage = DB.settings.hourlyWage || 0;
  if (wage <= 0) return 'Wage not set';
  const hours = amount / wage;
  if (hours < 1) {
    return Math.round(hours * 60) + ' mins';
  }
  const h = Math.floor(hours);
  const m = Math.round((hours % 1) * 60);
  return `${h}h ${m}m`;
}

function calculateFutureValue(amount) {
  const fv10 = amount * 2.5937; // 10% annual return for 10 years
  const fv20 = amount * 6.7275; // 10% annual return for 20 years
  return {
    fv10: fmtCurrency(fv10),
    fv20: fmtCurrency(fv20)
  };
}

function fmtCurrency(n) {
  return getCur() + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function openImpulseModal() {
  document.getElementById('impulseName').value = '';
  document.getElementById('impulsePrice').value = '';
  document.getElementById('impulseNotes').value = '';
  document.getElementById('impulsePeriod').value = '24';
  document.getElementById('impulseCurSym').textContent = getCur();
  
  const sel = document.getElementById('impulseAccount');
  sel.innerHTML = DB.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  toggleModal('impulseModalOverlay', 'impulseModal', true);
}

function closeImpulseModal(e) {
  if (!e || e.target === document.getElementById('impulseModalOverlay'))
    toggleModal('impulseModalOverlay', 'impulseModal', false);
}

function saveImpulseUrge() {
  const name = document.getElementById('impulseName').value.trim();
  const price = parseFloat(document.getElementById('impulsePrice').value);
  const hours = parseFloat(document.getElementById('impulsePeriod').value);
  const account = document.getElementById('impulseAccount').value;
  const notes = document.getElementById('impulseNotes').value.trim();

  if (!name) { showToast('Enter item name'); return; }
  if (!price || price <= 0) { showToast('Enter a valid price'); return; }

  const urge = {
    id: Date.now().toString(),
    name,
    price,
    coolingPeriod: hours,
    dateLogged: new Date().toISOString(),
    account,
    notes,
    status: 'cooling'
  };

  DB.impulseVault.push(urge);
  saveDB();
  closeImpulseModal();
  renderSmartSave();
  showToast('Urge locked in cooling vault! 🔒');
}

function renderSmartSave() {
  document.getElementById('vaultSavedCount').textContent = DB.stats.savedCount || 0;
  document.getElementById('vaultSavedAmount').textContent = 'Saved: ' + fmtCurrency(DB.stats.totalSaved || 0);

  const activeUrges = DB.impulseVault.filter(u => u.status === 'cooling');
  document.getElementById('activeUrgesCount').textContent = `${activeUrges.length} active`;

  const list = document.getElementById('impulseList');
  if (activeUrges.length === 0) {
    list.innerHTML = emptyState('Your Vault is Empty', 'Log impulse urges to start resisting bad spending habits.');
  } else {
    list.innerHTML = activeUrges.map(u => {
      const elapsedMs = new Date() - new Date(u.dateLogged);
      const totalMs = u.coolingPeriod * 60 * 60 * 1000;
      const remainingMs = Math.max(0, totalMs - elapsedMs);
      const pct = Math.min(100, (elapsedMs / totalMs) * 100);
      const isReady = remainingMs <= 0;

      let timerText = '';
      let badgeCls = '';
      let progressBg = '';
      if (isReady) {
        timerText = 'Ready to resist ✅';
        badgeCls = 'bg-tertiary/10 text-tertiary border-tertiary/20';
        progressBg = 'bg-tertiary';
      } else {
        const totSeconds = Math.floor(remainingMs / 1000);
        const hrs = Math.floor(totSeconds / 3600);
        const mins = Math.floor((totSeconds % 3600) / 60);
        const secs = totSeconds % 60;
        timerText = `${hrs}h ${mins}m ${secs}s left`;
        badgeCls = 'bg-secondary/10 text-secondary border-secondary/20';
        progressBg = 'bg-secondary';
      }

      const fv = calculateFutureValue(u.price);
      const lifeHours = DB.settings.hourlyWage > 0 ? calculateHoursOfWork(u.price) : 'Set hourly wage';

      return `
        <div class="glass p-5 rounded-3xl border border-outline-variant/15 dark:border-white/10 space-y-4" id="urge-${u.id}">
          <div class="flex justify-between items-start gap-3">
            <div>
              <h4 class="font-body font-bold text-base text-on-surface dark:text-white">${u.name}</h4>
              <p class="font-body text-xs text-on-surface-variant dark:text-gray-400 mt-0.5 italic">"${u.notes || 'No reflection logged'}"</p>
            </div>
            <div class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeCls}" id="timer-${u.id}">
              ${timerText}
            </div>
          </div>
          
          <div class="space-y-1.5">
            <div class="w-full h-2 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
              <div class="h-full rounded-full ${progressBg} transition-all duration-1000 impulse-progress-bar" style="width: ${pct}%;"></div>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-3 pt-2">
            <div class="bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/10 dark:border-white/10 text-center">
              <div class="text-[9px] font-bold uppercase text-on-surface-variant dark:text-gray-500">Price</div>
              <div class="font-headline font-bold text-sm text-on-surface dark:text-white mt-0.5">${fmtCurrency(u.price)}</div>
            </div>
            <div class="bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/10 dark:border-white/10 text-center">
              <div class="text-[9px] font-bold uppercase text-on-surface-variant dark:text-gray-500">Life Cost</div>
              <div class="font-headline font-bold text-sm text-primary dark:text-secondary-container mt-0.5">${lifeHours}</div>
            </div>
            <div class="bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/10 dark:border-white/10 text-center">
              <div class="text-[9px] font-bold uppercase text-on-surface-variant dark:text-gray-500">Value in 10 Yrs</div>
              <div class="font-headline font-bold text-sm text-green-600 dark:text-green-400 mt-0.5">${fv.fv10}</div>
            </div>
            <div class="bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/10 dark:border-white/10 text-center">
              <div class="text-[9px] font-bold uppercase text-on-surface-variant dark:text-gray-500">Value in 20 Yrs</div>
              <div class="font-headline font-bold text-sm text-green-600 dark:text-green-400 mt-0.5">${fv.fv20}</div>
            </div>
          </div>
          
          <div class="flex gap-3 pt-2">
            <button class="w-full bg-error/10 hover:bg-error/20 text-error border border-error/20 py-2.5 rounded-xl text-xs font-bold transition-colors active:scale-95 transition-transform" onclick="buyImpulse('${u.id}')">
              Buy Anyway 💸
            </button>
            <button class="w-full bg-primary-container text-white shadow-[0_0_20px_0_rgba(61,90,254,0.3)] hover:shadow-[0_0_25px_0_rgba(61,90,254,0.5)] border border-primary/20 py-2.5 rounded-xl text-xs font-bold transition-colors active:scale-95 transition-transform" onclick="saveImpulse('${u.id}')">
              ${isReady ? 'Resist & Save! 🎉' : 'Save & Defer'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderRunwaySection();
}

let impulseInterval;
function startImpulseTimer() {
  if (impulseInterval) clearInterval(impulseInterval);
  impulseInterval = setInterval(() => {
    const smartSavePage = document.getElementById('page-smartsave');
    if (smartSavePage && !smartSavePage.classList.contains('hidden')) {
      const activeUrges = DB.impulseVault.filter(u => u.status === 'cooling');
      activeUrges.forEach(u => {
        const elapsedMs = new Date() - new Date(u.dateLogged);
        const totalMs = u.coolingPeriod * 60 * 60 * 1000;
        const remainingMs = Math.max(0, totalMs - elapsedMs);
        const pct = Math.min(100, (elapsedMs / totalMs) * 100);

        const card = document.getElementById(`urge-${u.id}`);
        if (card) {
          const timerBadge = card.querySelector(`#timer-${u.id}`);
          const progressBar = card.querySelector('.impulse-progress-bar');
          
          if (progressBar) progressBar.style.width = pct + '%';
          
          if (timerBadge) {
            if (remainingMs <= 0) {
              if (!timerBadge.classList.contains('bg-tertiary/10')) {
                renderSmartSave();
              }
            } else {
              const totSeconds = Math.floor(remainingMs / 1000);
              const hrs = Math.floor(totSeconds / 3600);
              const mins = Math.floor((totSeconds % 3600) / 60);
              const secs = totSeconds % 60;
              timerBadge.textContent = `${hrs}h ${mins}m ${secs}s left`;
            }
          }
        }
      });
    }
  }, 1000);
}

function buyImpulse(id) {
  const idx = DB.impulseVault.findIndex(u => u.id === id);
  if (idx === -1) return;
  const u = DB.impulseVault[idx];
  if (!confirm(`Are you sure you want to buy "${u.name}" for ${fmtCurrency(u.price)}?`)) return;

  const txn = {
    id: Date.now().toString(),
    type: 'expense',
    amount: u.price,
    category: 'shopping',
    date: today(),
    time: nowTime(),
    notes: `[Impulse bought] ${u.name}${u.notes ? `: ${u.notes}` : ''}`,
    account: u.account || DB.accounts[0].id
  };

  DB.txns.push(txn);
  adjustAccountBalance(txn.account, 'expense', txn.amount, false);

  u.status = 'bought';
  DB.impulseVault.splice(idx, 1);

  saveDB();
  renderAll();
  showToast(`Bought! Logged as expense.`);
}

function saveImpulse(id) {
  const idx = DB.impulseVault.findIndex(u => u.id === id);
  if (idx === -1) return;
  const u = DB.impulseVault[idx];

  DB.stats.savedCount = (DB.stats.savedCount || 0) + 1;
  DB.stats.totalSaved = (DB.stats.totalSaved || 0) + u.price;

  DB.impulseVault.splice(idx, 1);

  saveDB();
  renderAll();
  showToast(`Urge resisted! Saved ${fmtCurrency(u.price)}! 🎉`);
}

function getRunwayData() {
  const totalBalance = DB.accounts.reduce((s, a) => s + a.balance, 0);

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  const last30DaysExpenses = DB.txns.filter(t => {
    const d = new Date(t.date);
    return t.type === 'expense' && d >= thirtyDaysAgo && d <= now;
  }).reduce((s, t) => s + t.amount, 0);

  const monthlyBurnRate = last30DaysExpenses;
  const dailyBurnRate = monthlyBurnRate / 30;

  let runwayDays = 0;
  if (dailyBurnRate > 0) {
    runwayDays = totalBalance / dailyBurnRate;
  } else {
    runwayDays = Infinity;
  }

  return {
    balance: totalBalance,
    monthlyBurnRate,
    runwayDays
  };
}

function renderRunwaySection() {
  const data = getRunwayData();

  document.getElementById('simBalance').textContent = fmtCurrency(data.balance);
  document.getElementById('simBurnRate').textContent = fmtCurrency(data.monthlyBurnRate) + ' / mo';

  let text = '';
  if (data.runwayDays === Infinity) {
    text = 'Infinite (No recent expenses)';
  } else {
    const runwayMonths = (data.runwayDays / 30).toFixed(1);
    text = `${Math.round(data.runwayDays)} days (${runwayMonths} months)`;
  }

  document.getElementById('runwayValue').textContent = text;
  document.getElementById('runwaySub').textContent = `At burn rate of ${fmtCurrency(data.monthlyBurnRate)}/mo`;

  updateRunwaySimulation();
}

function updateRunwaySimulation() {
  const data = getRunwayData();
  const slider = document.getElementById('runwayCutSlider');
  if (!slider) return;
  const cutPercentage = parseFloat(slider.value); // 50 to 100

  const displayPercent = 100 - cutPercentage;
  const labelEl = document.getElementById('sliderVal');
  if (labelEl) {
    labelEl.textContent = cutPercentage === 100 
      ? '100% (No Cut)' 
      : `${cutPercentage}% (Cut ${displayPercent}%)`;
  }

  const simulatedMonthlyBurn = data.monthlyBurnRate * (cutPercentage / 100);
  const simulatedDailyBurn = simulatedMonthlyBurn / 30;

  let simulatedRunwayDays = 0;
  if (simulatedDailyBurn > 0) {
    simulatedRunwayDays = data.balance / simulatedDailyBurn;
  } else {
    simulatedRunwayDays = Infinity;
  }

  const resVal = document.getElementById('simRunwayResult');
  const resDiff = document.getElementById('simRunwayDiff');

  if (!resVal || !resDiff) return;

  if (simulatedRunwayDays === Infinity) {
    resVal.textContent = 'Infinite Runway 🚀';
    resDiff.textContent = 'No expenses simulated!';
    resDiff.className = 'text-xs text-on-surface-variant dark:text-gray-400';
  } else {
    const m = (simulatedRunwayDays / 30).toFixed(1);
    resVal.textContent = `${Math.round(simulatedRunwayDays)} days (${m} months)`;

    if (cutPercentage === 100) {
      resDiff.textContent = 'Slide to see how cutting spending extends your runway.';
      resDiff.className = 'text-xs text-on-surface-variant dark:text-gray-400';
    } else {
      const originalDays = data.runwayDays === Infinity ? 0 : data.runwayDays;
      const addedDays = Math.round(simulatedRunwayDays - originalDays);
      const savedAmt = data.monthlyBurnRate * (displayPercent / 100);
      resDiff.textContent = `Saving ${fmtCurrency(savedAmt)}/mo extends runway by +${addedDays} days!`;
      resDiff.className = 'text-xs text-green-600 dark:text-green-400 font-bold';
    }
  }
}

function syncAllTabs() {
  document.querySelectorAll('.ptab').forEach(b => {
    const onClickAttr = b.getAttribute('onclick') || '';
    let isActive = false;
    
    if (onClickAttr.includes('setDashPeriod')) {
      isActive = onClickAttr.includes(`'${dashPeriod}'`);
    } else if (onClickAttr.includes('setTxnPeriod')) {
      isActive = onClickAttr.includes(`'${txnPeriod}'`);
    } else if (onClickAttr.includes('setAnalysisPeriod')) {
      isActive = onClickAttr.includes(`'${analysisPeriod}'`);
    } else {
      return;
    }
    
    if (isActive) {
      b.classList.remove('text-on-surface-variant', 'dark:text-gray-400');
      b.classList.add('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-primary', 'dark:text-secondary-container');
    } else {
      b.classList.remove('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-primary', 'dark:text-secondary-container');
      b.classList.add('text-on-surface-variant', 'dark:text-gray-400');
    }
  });
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
  updateThemeUI();
  renderAll();
  showToast(document.documentElement.classList.contains('dark') ? 'Dark mode enabled 🌙' : 'Light mode enabled ☀️');
}

function updateThemeUI() {
  const isDark = document.documentElement.classList.contains('dark');
  const iconText = isDark ? 'light_mode' : 'dark_mode';
  const mobileIcon = document.getElementById('theme-toggle-icon-mobile');
  const desktopIcon = document.getElementById('theme-toggle-icon-desktop');
  if (mobileIcon) mobileIcon.textContent = iconText;
  if (desktopIcon) desktopIcon.textContent = iconText;
}

/* ======================== CUSTOM CATEGORY CREATION ======================== */
let newCatSelectedColor = '#ef4444';

function openCreateCategoryModal() {
  document.getElementById('newCatName').value = '';
  document.getElementById('newCatEmoji').value = '☕';
  
  // Set type based on current selection in addModal
  const typeSelect = document.getElementById('newCatType');
  if (typeSelect) {
    typeSelect.value = selectedType === 'income' ? 'income' : 'expense';
  }
  
  setNewCatColor('#ef4444');
  toggleModal('customCatModalOverlay', 'customCatModal', true);
}

function closeCreateCategoryModal(e) {
  if (!e || e.target === document.getElementById('customCatModalOverlay')) {
    toggleModal('customCatModalOverlay', 'customCatModal', false);
  }
}

function setNewCatColor(color) {
  newCatSelectedColor = color;
  const preview = document.getElementById('newCatColorPreview');
  if (preview) {
    preview.style.backgroundColor = color;
  }
  const colorInput = document.getElementById('newCatColorInput');
  if (colorInput) {
    colorInput.value = color;
  }
}

function setNewCatEmoji(emoji) {
  const emojiInput = document.getElementById('newCatEmoji');
  if (emojiInput) {
    emojiInput.value = emoji;
  }
}

function saveCustomCategory() {
  const nameInput = document.getElementById('newCatName');
  const name = nameInput ? nameInput.value.trim() : '';
  
  if (!name) {
    showToast('Please enter a category name');
    return;
  }
  
  // Create safe ID from name
  const safeId = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
  const emoji = document.getElementById('newCatEmoji').value.trim() || '📦';
  const type = document.getElementById('newCatType').value;
  
  const newCat = {
    id: safeId,
    name: name,
    icon: emoji,
    color: newCatSelectedColor
  };
  
  // Initialize arrays if they don't exist
  if (!DB.categories) DB.categories = [];
  if (!DB.incomeCats) DB.incomeCats = [];
  
  // Check for duplicate name
  const duplicate = getAllCategories().some(c => c.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    showToast('A category with this name already exists');
    return;
  }
  
  // Add to categories
  DB.categories.push(newCat);
  
  // Add to income mapping if applicable
  if (type === 'income') {
    DB.incomeCats.push(safeId);
  }
  
  // Save DB and sync to Firestore
  saveDB();
  
  // Refresh lists
  populateCatFilter();
  populateBudgetCatSelect();
  
  // Auto-select the newly created category in Add modal
  selectedCat = safeId;
  populateCatGrid();
  
  // Close modal and notify
  toggleModal('customCatModalOverlay', 'customCatModal', false);
  showToast(`Category "${name}" created!`);
}
