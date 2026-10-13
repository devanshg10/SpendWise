# SpendWise 💰
> **Personal Expense Tracker & Budget Dashboard**

SpendWise is a clean, responsive personal finance dashboard built with pure HTML, CSS, and JavaScript. It runs 100% in the browser with no backend or database required.

---

## ✨ Features

- **Dashboard**: Track Net Balance, Total Income, Total Expenses, and Monthly Budget.
- **Transactions**: Add, edit, delete, search, filter (category/date/type), and sort transactions.
- **Budgets & Alerts**: Set overall and category budgets with automatic 80% warning and 100% breach alerts.
- **Interactive Charts**: Category doughnut chart, income vs. expense cash flow line chart, and monthly bar comparison (via Chart.js).
- **Rule-Based Insights**: Calculated metrics showing top spending categories, daily burn rates, and month-over-month trends.
- **Data Backup & Export**: Export to CSV or JSON backup, and import backups anytime.
- **Themes**: Switch between Light and Dark modes.

---

## 🛠️ Tech Stack

- **HTML5** & **CSS3** (Responsive design, CSS variables)
- **Vanilla JavaScript** (Zero frameworks)
- **Chart.js** (Interactive data visualizations via CDN)
- **Lucide Icons** (CDN)
- **localStorage** (Client-side persistence)

---

## 🧮 Calculations & Precision

- **Currency**: Indian Rupees (₹).
- **Paise Precision**: All amounts are stored internally as integer paise (`amount * 100`) to prevent floating-point rounding errors (`0.1 + 0.2`).
- **Utilization**: `(Current Month Expenses / Budget) * 100`.

---

## 🔒 Storage & Privacy Note

- **100% Private**: All data stays inside your browser's `localStorage`. No data is sent to external servers.
- **Device Boundary**: Data does not sync automatically across different devices. Use **Data Management → Export / Import JSON** to transfer data between devices.

---

## 🚀 How to Run Locally

No installations or build steps needed:

1. Clone or download this repo.
2. Open `index.html` directly in any web browser.

Or run with a local server:
```bash
# Python
python3 -m http.server 3000

# Node.js
npx serve .
```

---

## 🌐 Deploy to Vercel

1. Push your repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your **SpendWise** repo.
4. Click **Deploy** (no build settings required).

---

## 📄 License

MIT License.
