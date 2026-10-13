# SpendWise — Personal Expense Tracker & Budget Dashboard

SpendWise is a responsive frontend-only personal finance dashboard and budget tracker inspired by modern banking and financial management applications. Built with HTML5, CSS3, vanilla JavaScript, and Chart.js, it provides real-time cash flow analytics, budget utilization warnings, and rule-based spending insights—completely client-side with zero backend dependencies.

---

## 🌟 Key Features

### 1. Financial Overview & Dashboard
- **Real-Time Key Metrics**: Displays Net Balance, Total Income, Total Expenses, and Remaining Monthly Budget.
- **Budget Utilization Meter**: Live progress meter highlighting percentage spent against the monthly ceiling.
- **Dynamic Threshold Alerts**: Automatic amber banners at 80% spending and danger alerts when budgets are exceeded.
- **Dual Visual Trend Previews**: 6-month cash flow trajectory and current-month category breakdown doughnuts.
- **Recent Transactions Ledger**: Instant inspection of latest income and expense activities with quick edit/delete actions.

### 2. Transaction Management
- **Full CRUD Support**: Add, view, edit, and delete transactions with confirmation modals.
- **Granular Classification**: Classify entries across 10 distinct categories (`Food`, `Travel`, `Shopping`, `Education`, `Bills`, `Entertainment`, `Health`, `Salary`, `Freelance`, `Other`).
- **Input Validation**: Validates positive amounts, non-empty titles, valid dates, and sanitizes descriptions.
- **Advanced Search & Filtering**:
  - Full-text search matching title, description, and category.
  - Type filter (`All`, `Income Only`, `Expense Only`).
  - Category dropdown filter.
  - Date range filtering (`From` and `To` dates).
- **Multi-criteria Sorting**: Sort by date (newest/oldest) or amount (highest/lowest).
- **Configurable Pagination**: Select 10, 25, 50, or 100 rows per page with page indicators and navigation.

### 3. Budget Management
- **Overall Monthly Spending Ceiling**: Set and edit your total spending limit for the month.
- **Category-Specific Budgets**: Define individual limits for categories (e.g., Food, Shopping, Bills).
- **Proactive Visual Indicators**:
  - 🟢 **Normal (< 80%)**: Safe spending pacing.
  - 🟡 **Warning (80% - 99%)**: Approaching monthly limit.
  - 🔴 **Exceeded (≥ 100%)**: Critical breach notice indicating exact overspent Rupee amount.

### 4. Interactive Analytics & Visualizations
Powered by **Chart.js**:
- **Expense Breakdown (Doughnut Chart)**: Visual allocation by category with accompanied percentage share breakdown table.
- **Cash Flow Comparison (Line Chart)**: Tracks income vs. expenses over time for the selected period.
- **Monthly Expenses Comparison (Bar Chart)**: Compares spending across chronological calendar months.
- **Flexible Timeframes**: Filter analytics by `Current Month`, `Last Month`, `Last 3 Months`, `Last 6 Months`, or `All Time`.
- **Automated Empty States**: Helpful fallback illustrations and messages when transaction data is sparse.

### 5. Deterministic Smart Spending Insights
Rule-based metrics (not AI-generated financial advice):
- **Top Spending Category**: Identifies the primary expense driver and its share of monthly expenditures.
- **Average Daily Spending**: Computes daily expense velocity and projects month-end spending.
- **Month-over-Month Velocity**: Calculates percentage change in expenses compared to the preceding month.
- **Category Concentration Spike Alert**: Flags when a single category consumes $\ge 40\%$ of monthly spending.
- **Budget Runway**: Tracks remaining safe spend and calendar days remaining in the billing period.

### 6. Data Management, Export & Archival
- **CSV Export**: Download spreadsheet-ready CSV logs (`Date`, `Title`, `Type`, `Category`, `Amount INR`, `Description`).
- **Full JSON Backup**: One-click download of all transactions, category budgets, monthly limits, and theme preferences.
- **Validated JSON Restore**: Restores data with schema validation and confirmation prompts.
- **One-Click Demo Data**: Instantly load realistic Indian Rupee ($\text{₹}$) transactions or wipe local records clean.

### 7. Modern UI/UX Design
- **Theme Modes**: One-click switch between Emerald Light and Deep Navy Slate Dark modes.
- **Responsive Navigation**: Persistent desktop sidebar and touch-friendly mobile bottom navigation bar.
- **Accessible & Polish**: Form validation, SVG Lucide icons, accessible dialog backdrops, and animated toast notifications.

---

## 🧮 Mathematical Calculations & Currency Handling

### Precision Integer Arithmetic (Paise)
To eliminate IEEE-754 floating-point arithmetic errors (such as `0.1 + 0.2 = 0.30000000000000004`), SpendWise stores all financial values internally as **integer paise**:

$$\text{amountPaise} = \operatorname{round}(\text{amountINR} \times 100)$$

Calculations are evaluated in paise and converted to Indian Rupees ($\text{₹}$) via `Intl.NumberFormat('en-IN')` upon display:

```javascript
// Net Balance
netBalancePaise = totalIncomePaise - totalExpensePaise;

// Budget Utilization Percentage
utilizationPercent = Math.round((currentMonthExpensePaise / overallBudgetPaise) * 100);

// Remaining Budget
remainingBudgetPaise = overallBudgetPaise - currentMonthExpensePaise;

// Average Daily Spending
averageDailyPaise = Math.round(currentMonthExpensePaise / daysPassedInMonth);

// Month-over-Month Change
momChangePercent = Math.round(((curMonthExpensePaise - prevMonthExpensePaise) / prevMonthExpensePaise) * 100);
```

---

## 🛠️ Technology Stack

- **HTML5**: Semantic document layout with accessible dialogs and ARIA labels.
- **CSS3**: Custom design tokens, CSS variables, CSS Grid, Flexbox, and fluid typography.
- **JavaScript (ES6+)**: Vanilla modular JavaScript with IIFE encapsulation.
- **Chart.js (v4.4 via CDN)**: Responsive interactive charts for data visualization.
- **Lucide Icons (via CDN)**: Crisp SVG icons rendered dynamically.
- **Storage**: Browser `localStorage` sandbox.

---

## 🔒 LocalStorage Architecture & Privacy Limits

1. **Client-Side Data Privacy**: All data is stored strictly inside the user's browser sandbox (`localStorage`). No financial records or telemetry are transmitted to any server.
2. **Device Isolation**: Because data is client-local, transactions created in one browser or device will not synchronize automatically to another. Use **Data Management → Export JSON Backup** and **Import JSON Backup** to transfer records between devices.
3. **Storage Quota**: Browsers allocate approximately 5 MB of `localStorage` per domain, accommodating tens of thousands of transaction records with zero performance degradation.

---

## 💻 Local Setup & Development

SpendWise has **zero build steps** and requires no Node.js or compiler tools.

### Option A: Direct Browser Launch
1. Download or clone this repository.
2. Double-click [index.html](file:///Users/ashi/Desktop/Semester-Project-2/index.html) or open it in any modern browser (Chrome, Safari, Firefox, Edge).

### Option B: Local HTTP Server (Python / npx)
To test with a local web server:

```bash
# Using Python 3
python3 -m http.server 3000

# Using Node.js
npx serve .
```

Open your browser at `http://localhost:3000`.

---

## 🚀 Deployment to Vercel

SpendWise is pre-configured for static deployment on [Vercel](https://vercel.com):

### Method 1: Deploy with Vercel CLI
```bash
# 1. Install Vercel CLI (if not already installed)
npm install -g vercel

# 2. Deploy from the project root
vercel --prod
```

### Method 2: Deploy via GitHub / GitLab
1. Push this repository to GitHub or GitLab.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import the repository.
4. Leave **Build Command** and **Output Directory** empty (static HTML project).
5. Click **Deploy**. Your site will be live instantly with global CDN caching and HTTPS.

---

## 📁 Project Structure

```
SpendWise/
├── index.html     # Application structure, accessible modals & view layouts
├── style.css      # Light/Dark themes, responsive grids, animations & cards
├── script.js      # Financial logic in paise, Chart.js managers, storage & filters
└── README.md      # Documentation, calculations, architecture & deployment
```

---

## 📄 License
MIT License. Free for personal and commercial use.
