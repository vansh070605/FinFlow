# 🌊 FinFlow – Personal Finance Tracker.

FinFlow is a premium, beautiful, fully **offline-capable** personal finance manager PWA built with vanilla HTML, CSS, and JavaScript, enhanced with **Firebase Authentication**, **Cloud Firestore Synchronization**, and **Custom Category Customization**. 

It supports dynamic **Vivid Dark Mode** and **Flexfin Light Mode** transitions and provides a highly-polished, premium visual aesthetic.

---

## ✨ Features as follows

- **📊 Dashboard Overview** – Weekly, Monthly, and Yearly spending overview with clean interactive Chart.js bar and doughnut charts.
- **🔐 Firebase Authentication** – Create a personal account with Name, Email, and Password, or run in **Offline Guest Mode** (saving data to LocalStorage only).
- **☁️ Cloud Firestore Sync** – Instantly sync your transactions, budgets, accounts, and vaults to the cloud in real-time when authenticated. Works seamlessly with local storage so you never lose data when offline.
- **➕ Custom Categories** – Create custom categories for Expense and Income directly from the Add Transaction form. Choose from a palette of vibrant colors and popular emojis, or enter custom emojis.
- **🎯 Monthly Budgets** – Set custom monthly spending limits per category (including custom ones) with visual progress bars.
- **🏦 Account Ledger** – Track balances across multiple accounts (Cash, SBI Bank, Wallet, Credit Cards) with automatic ledger adjustments.
- **🧠 Impulse Save Vault** – Lock away impulse buy urges during a customizable cooling-off period (24h/48h/3d/7d) to build healthy spending habits.
- **🎒 Interactive Guide Tour** – A beautiful glassmorphic multi-slide interactive guided onboarding tour to walk users through features on first login.
- **📤 Export & Import** – Export transactions to CSV or JSON; import from JSON backup.
- **📱 PWA & Mobile Optimization** – Standalone mobile app installation, custom app icons, smooth slide-up bottom toasts, and service worker offline caching.

---

## 🛠️ Technology Stack

- **Frontend Core:** Semantic HTML5, Vanilla JavaScript (ES6+), Vanilla CSS (Flexbox, Grid)
- **Styling Framework:** Tailwind CSS (fully responsive, dark/light active states)
- **Charts:** Chart.js (customized HSL colors, responsive layouts)
- **Database & Sync:** Cloud Firestore (Firebase SDK client-side persistence enabled)
- **Authentication:** Firebase Auth (Email/Password credentials)
- **PWA Config:** Service Worker (`sw.js`), Web Manifest (`manifest.json`)

---

## 📂 Project Structure

| File / Folder | Purpose / Description |
|---|---|
| `index.html` | Core UI structure, modals markup, and Firebase script bindings |
| `app.js` | Core application logic, Firestore syncing, PWA triggers, and state management |
| `style.css` | Global styling variables, dark/light theme tokens, and custom scrollbars |
| `firebase-config.js` | Firebase SDK credentials configuration and persistence setups |
| `manifest.json` | PWA installation settings (standalone mode, icons, and theme color) |
| `sw.js` | Service Worker caching all static assets and fonts for full offline operation |

---

## 🚀 How to Run Locally

You can launch a local server to test full PWA features:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve .
```

Then visit **`http://localhost:8000`** in your browser.

---

## 🌐 How to Deploy to Firebase Hosting (Recommended)

Since the project uses Firebase Authentication and Cloud Firestore, **Firebase Hosting** is the easiest way to deploy the application for free. It automatically configures HTTPS (required for PWAs).

### Step 1: Install Firebase CLI
Install the tools globally on your machine:
```bash
npm install -g firebase-tools
```

### Step 2: Log in
Sign in using your Google Account associated with the Firebase console:
```bash
firebase login
```

### Step 3: Initialize Project
Inside your project folder, run the setup wizard:
```bash
firebase init hosting
```
- **Project Selection:** Choose **Use an existing project** and select `finflow-bb0fd`.
- **Public Directory:** Enter `.` (the current root folder).
- **Configure as single-page app:** Enter `y` (Yes).
- **Setup automatic builds with GitHub:** Enter `n` (No).
- **File Overwrites:** If it asks to overwrite `index.html`, enter `n` (No) to preserve the application code!

### Step 4: Deploy
Deploy your static assets to the cloud:
```bash
firebase deploy --only hosting
```
Once deployed, the terminal will print your live URL (e.g. `https://finflow-bb0fd.web.app`). Open this on your mobile device to install it to your home screen!
