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


