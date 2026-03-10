# Finsight – Expense Manager

A powerful, beautiful, fully **offline-capable** expense manager PWA built with vanilla HTML/CSS/JavaScript.

## ✨ Features

- **📊 Dashboard** – Weekly, Monthly, and Yearly spending overview with bar + doughnut charts
- **📋 Transactions** – Full transaction history with filters by period, type, category, and text search
- **📅 Custom Date Range** – Filter transactions between any two dates
- **📈 Analysis** – Deep dive into spending trends, category breakdowns with progress bars
- **🎯 Budgets** – Set monthly limits per category with visual progress bars
- **🏦 Accounts** – Multiple accounts (Bank, Cash, Credit, Wallet) with balance tracking
- **📤 Export** – Export to CSV or JSON backup; import from JSON
- **⚙️ Settings** – Custom name, currency symbol (₹ $ € £ ¥)
- **📱 Mobile Responsive** – Bottom nav, FAB button, works on mobile browsers
- **🌐 Offline PWA** – Installable, works fully offline via Service Worker

## 🏷️ Categories

Others, Medical, Food & Dining, Shopping, Transport, Rent, Bills & Utilities,
Entertainment, Gym, Travel, Education, Personal Care, Lending, Party, Mandir,
Bet, Salary, Freelance, Investment, Gift

## 🚀 How to Run

### Option 1: Open directly (Recommended for offline use)
Simply open `index.html` in any modern browser (Chrome, Edge, Firefox).

> **Note**: Service Worker (offline caching) requires a web server. Use Option 2 for full PWA features.

### Option 2: Local web server
```bash
# Using Python
python -m http.server 8000
# Then open: http://localhost:8000

# Using Node.js (npx)
npx serve .
# Then open the URL shown
```

### Option 3: Deploy to GitHub Pages / Netlify / Vercel
Just push this folder to a GitHub repo and enable GitHub Pages — it's all static files!

## 📂 Files

| File | Description |
|------|-------------|
| `index.html` | Main app HTML |
| `style.css`  | All styles (dark theme, responsive) |
| `app.js`     | App logic, data management, charts |
| `manifest.json` | PWA manifest |
| `sw.js`      | Service Worker for offline support |

## 💾 Data Storage

All data is stored in **localStorage** – no server, no account needed, completely private.
Export your data as JSON for backup and import it back anytime.
