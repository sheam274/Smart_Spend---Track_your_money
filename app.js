// ===== SmartSpend - vanilla JS expense tracker =====
// data model: { id, title, amount, type, category, date }

const STORAGE_KEY = 'smartspend.tx.v1';
const THEME_KEY = 'smartspend.theme';

// ---- state ----
let txs = load();
let filter = { type: 'all', cat: 'all', q: '' };

// ---- DOM refs ----
const $ = (s) => document.querySelector(s);
const form = $('#txForm');
const list = $('#txList');
const empty = $('#empty');
const chart = $('#chart');
const totalInc = $('#totalIncome');
const totalExp = $('#totalExpense');
const balanceEl = $('#balance');
const filterType = $('#filterType');
const filterCat = $('#filterCat');
const searchInp = $('#search');
const themeBtn = $('#themeBtn');

// ---- init ----
initTheme();
form.date.value = new Date().toISOString().slice(0, 10);
render();

// ---- events ----
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const tx = {
        id: Date.now().toString(),
        title: (fd.get('title') || '').toString().trim(),
        amount: Number(fd.get('amount')),
        type: fd.get('type'),
        category: fd.get('category'),
        date: fd.get('date'),
    };
    if (!tx.title || !tx.amount || tx.amount <= 0) return;
    txs.unshift(tx);
    save();
    form.reset();
    form.date.value = new Date().toISOString().slice(0, 10);
    render();
});

list.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-del]');
    if (!btn) return;
    txs = txs.filter((t) => t.id !== btn.dataset.del);
    save();
    render();
});

filterType.addEventListener('change', () => { filter.type = filterType.value; render(); });
filterCat.addEventListener('change', () => { filter.cat = filterCat.value; render(); });
searchInp.addEventListener('input', () => { filter.q = searchInp.value.toLowerCase(); render(); });

themeBtn.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(cur);
});

// ---- functions ----
function render() {
    const income = txs.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
    totalInc.textContent = '৳' + income.toLocaleString();
    totalExp.textContent = '৳' + expense.toLocaleString();
    balanceEl.textContent = '৳' + (income - expense).toLocaleString();

    const shown = txs.filter((t) => {
        if (filter.type !== 'all' && t.type !== filter.type) return false;
        if (filter.cat !== 'all' && t.category !== filter.cat) return false;
        if (filter.q && !t.title.toLowerCase().includes(filter.q)) return false;
        return true;
    });

    list.innerHTML = shown.map(rowHTML).join('');
    empty.classList.toggle('hidden', shown.length > 0);

    drawChart();
}

function rowHTML(t) {
    const sign = t.type === 'income' ? '+' : '-';
    const initial = (t.title[0] || '?').toUpperCase();
    return `
        <li class="tx ${t.type}">
            <div class="icon">${initial}</div>
            <div class="meta">
                <span class="title">${escapeHtml(t.title)}</span>
                <span class="sub">${t.category} · ${formatDate(t.date)}</span>
            </div>
            <span class="amt">${sign}৳${t.amount.toLocaleString()}</span>
            <button data-del="${t.id}" aria-label="Delete">Delete</button>
        </li>`;
}

function drawChart() {
    const byCat = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
        byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    });
    const total = Object.values(byCat).reduce((a, b) => a + b, 0);
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
        chart.innerHTML = '<p class="hint">Add some expenses to see the breakdown.</p>';
        return;
    }
    chart.innerHTML = entries.map(([cat, amt]) => {
        const pct = total ? Math.round((amt / total) * 100) : 0;
        return `
            <div class="bar">
                <div class="top"><span>${cat}</span><span>৳${amt.toLocaleString()} · ${pct}%</span></div>
                <div class="track"><div class="fill" style="width:${pct}%"></div></div>
            </div>`;
    }).join('');
}

function formatDate(iso) {
    try {
        return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
}

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(txs)); }
function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    setTheme(saved);
}
function setTheme(mode) {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem(THEME_KEY, mode);
    themeBtn.textContent = mode === 'dark' ? '☀️ Light' : '🌙 Dark';
}