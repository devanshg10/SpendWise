/**
 * SpendWise — Personal Expense Tracker & Budget Dashboard
 * High-performance, vanilla JavaScript client-side application.
 * Precision currency storage using integer paise (1 INR = 100 Paise).
 */

(function () {
  'use strict';

  // --- Constants & Storage Keys ---
  const STORAGE_KEYS = {
    TRANSACTIONS: 'spendwise_transactions',
    BUDGETS: 'spendwise_budgets',
    SETTINGS: 'spendwise_settings'
  };

  const VALID_CATEGORIES = [
    'Food', 'Travel', 'Shopping', 'Education', 'Bills',
    'Entertainment', 'Health', 'Salary', 'Freelance', 'Other'
  ];

  const CATEGORY_COLORS = {
    Food: '#ea580c',
    Travel: '#0284c7',
    Shopping: '#c026d3',
    Education: '#4f46e5',
    Bills: '#e11d48',
    Entertainment: '#7c3aed',
    Health: '#0d9488',
    Salary: '#059669',
    Freelance: '#0891b2',
    Other: '#64748b'
  };

  const CATEGORY_ICONS = {
    Food: 'utensils',
    Travel: 'plane',
    Shopping: 'shopping-bag',
    Education: 'graduation-cap',
    Bills: 'receipt',
    Entertainment: 'film',
    Health: 'activity',
    Salary: 'banknote',
    Freelance: 'briefcase',
    Other: 'tag'
  };

  // --- State ---
  const state = {
    transactions: [],
    budgets: {
      overallPaise: 6500000, // ₹65,000 default overall limit
      categories: {
        Food: 1500000,       // ₹15,000
        Bills: 1200000,      // ₹12,000
        Shopping: 1000000,   // ₹10,000
        Entertainment: 500000, // ₹5,000
        Travel: 600000       // ₹6,000
      }
    },
    settings: {
      theme: 'light',
      hasInitialized: false
    },
    currentView: 'dashboard',
    filter: {
      search: '',
      type: 'all',
      category: 'all',
      startDate: '',
      endDate: '',
      sort: 'date-desc'
    },
    pagination: {
      page: 1,
      rowsPerPage: 25
    },
    analyticsPeriod: 'current-month',
    chartInstances: {}
  };

  // --- Helper Functions ---

  /**
   * Format integer paise to INR currency string (₹ XX,XXX.XX)
   */
  function formatINR(paise, includeDecimals = true) {
    if (typeof paise !== 'number' || isNaN(paise)) paise = 0;
    const rupees = paise / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: includeDecimals ? 2 : 0,
      maximumFractionDigits: includeDecimals ? 2 : 0
    }).format(rupees);
  }

  /**
   * Convert user float rupees string to integer paise
   */
  function rupeesToPaise(val) {
    const floatVal = parseFloat(val);
    if (isNaN(floatVal) || floatVal <= 0) return 0;
    return Math.round(floatVal * 100);
  }

  /**
   * Convert integer paise to decimal rupees string for input values
   */
  function paiseToRupees(paise) {
    if (!paise) return '0.00';
    return (paise / 100).toFixed(2);
  }

  /**
   * Safe unique ID generator
   */
  function generateId() {
    return 'txn_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  }

  /**
   * Get formatted YYYY-MM-DD from Date
   */
  function formatDateKey(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Format human readable date (e.g. 12 Oct 2026)
   */
  function formatHumanDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Get month name and year from YYYY-MM
   */
  function formatMonthName(yearMonthStr) {
    const [y, m] = yearMonthStr.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }

  /**
   * Current year-month key (e.g. "2026-10")
   */
  function getCurrentYearMonth() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  /**
   * Previous year-month key
   */
  function getPreviousYearMonth() {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  // --- Local Storage Management ---

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(state.budgets));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
    } catch (err) {
      console.error('Storage quota exceeded or error saving:', err);
      showToast('Error saving data to local storage', 'error');
    }
  }

  function loadFromStorage() {
    try {
      const storedTxns = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const storedBudgets = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);

      if (storedSettings) {
        state.settings = { ...state.settings, ...JSON.parse(storedSettings) };
      }

      if (storedBudgets) {
        state.budgets = { ...state.budgets, ...JSON.parse(storedBudgets) };
      }

      if (storedTxns) {
        const parsed = JSON.parse(storedTxns);
        if (Array.isArray(parsed)) {
          state.transactions = parsed;
        }
      } else {
        // First run: load sample dataset
        loadSampleData(false);
      }
    } catch (err) {
      console.error('Failed to load from localStorage:', err);
      state.transactions = [];
    }
  }

  /**
   * Comprehensive realistic Indian sample data
   */
  function loadSampleData(showNotification = true) {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-indexed

    // Format date in current month
    const dCur = (day) => {
      const d = new Date(curYear, curMonth, day);
      return formatDateKey(d);
    };

    // Format date in previous month
    const dPrev = (day) => {
      const d = new Date(curYear, curMonth - 1, day);
      return formatDateKey(d);
    };

    const sampleTxns = [
      // Current Month Incomes
      {
        id: generateId(),
        title: 'TechCorp Solutions Salary',
        amountPaise: 8500000, // ₹85,000
        type: 'income',
        category: 'Salary',
        date: dCur(1),
        description: 'Monthly direct deposit salary credit',
        createdAt: Date.now() - 10000000
      },
      {
        id: generateId(),
        title: 'Freelance Design Consultation',
        amountPaise: 2400000, // ₹24,000
        type: 'income',
        category: 'Freelance',
        date: dCur(7),
        description: 'Frontend design sprint milestone payout',
        createdAt: Date.now() - 8000000
      },
      // Current Month Expenses
      {
        id: generateId(),
        title: 'Nature Basket Supermarket',
        amountPaise: 425000, // ₹4,250
        type: 'expense',
        category: 'Food',
        date: dCur(2),
        description: 'Weekly organic groceries, fruits, and staples',
        createdAt: Date.now() - 9000000
      },
      {
        id: generateId(),
        title: 'Swiggy Gourmet Order',
        amountPaise: 84000, // ₹840
        type: 'expense',
        category: 'Food',
        date: dCur(4),
        description: 'Weekend dinner with family',
        createdAt: Date.now() - 7500000
      },
      {
        id: generateId(),
        title: 'Electricity & High-speed Fiber Bill',
        amountPaise: 345000, // ₹3,450
        type: 'expense',
        category: 'Bills',
        date: dCur(5),
        description: 'Monthly BESCOM electric & Airtel broadband bills',
        createdAt: Date.now() - 7000000
      },
      {
        id: generateId(),
        title: 'Metro Rail & Uber Cab Rides',
        amountPaise: 165000, // ₹1,650
        type: 'expense',
        category: 'Travel',
        date: dCur(6),
        description: 'Commute and city meetings transit',
        createdAt: Date.now() - 6500000
      },
      {
        id: generateId(),
        title: 'Amazon Festive Shopping',
        amountPaise: 389000, // ₹3,890
        type: 'expense',
        category: 'Shopping',
        date: dCur(8),
        description: 'Ergonomic keyboard and desk accessory',
        createdAt: Date.now() - 5000000
      },
      {
        id: generateId(),
        title: 'Udemy Advanced Fullstack Course',
        amountPaise: 149900, // ₹1,499
        type: 'expense',
        category: 'Education',
        date: dCur(9),
        description: 'Professional skill development course',
        createdAt: Date.now() - 4000000
      },
      {
        id: generateId(),
        title: 'PVR IMAX Movie Tickets & Snacks',
        amountPaise: 125000, // ₹1,250
        type: 'expense',
        category: 'Entertainment',
        date: dCur(10),
        description: 'Weekend premiere with friends',
        createdAt: Date.now() - 3000000
      },
      {
        id: generateId(),
        title: 'Apollo Pharmacy & Health Check',
        amountPaise: 110000, // ₹1,100
        type: 'expense',
        category: 'Health',
        date: dCur(11),
        description: 'Routine vitamins & health consultation',
        createdAt: Date.now() - 2000000
      },
      {
        id: generateId(),
        title: 'Artisan Cafe & Bakery',
        amountPaise: 68000, // ₹680
        type: 'expense',
        category: 'Food',
        date: dCur(12),
        description: 'Coffee meetings and quick bites',
        createdAt: Date.now() - 1000000
      },

      // Previous Month Incomes
      {
        id: generateId(),
        title: 'TechCorp Solutions Salary',
        amountPaise: 8500000, // ₹85,000
        type: 'income',
        category: 'Salary',
        date: dPrev(1),
        description: 'Monthly base salary',
        createdAt: Date.now() - 35000000
      },
      {
        id: generateId(),
        title: 'Client Web Maintenance',
        amountPaise: 1500000, // ₹15,000
        type: 'income',
        category: 'Freelance',
        date: dPrev(15),
        description: 'Retainer fee',
        createdAt: Date.now() - 30000000
      },
      // Previous Month Expenses
      {
        id: generateId(),
        title: 'Wholesale Grocery Supplies',
        amountPaise: 620000, // ₹6,200
        type: 'expense',
        category: 'Food',
        date: dPrev(3),
        description: 'Full monthly kitchen stocking',
        createdAt: Date.now() - 34000000
      },
      {
        id: generateId(),
        title: 'City Power & Water Utility',
        amountPaise: 290000, // ₹2,900
        type: 'expense',
        category: 'Bills',
        date: dPrev(5),
        description: 'Utility bills',
        createdAt: Date.now() - 33000000
      },
      {
        id: generateId(),
        title: 'Apparel & Shoe Outlet',
        amountPaise: 540000, // ₹5,400
        type: 'expense',
        category: 'Shopping',
        date: dPrev(12),
        description: 'Office wear apparel and footwear',
        createdAt: Date.now() - 28000000
      },
      {
        id: generateId(),
        title: 'Interstate Train Tickets',
        amountPaise: 280000, // ₹2,800
        type: 'expense',
        category: 'Travel',
        date: dPrev(18),
        description: 'IRCTC booking for home visit',
        createdAt: Date.now() - 25000000
      },
      {
        id: generateId(),
        title: 'Annual Dental Checkup',
        amountPaise: 150000, // ₹1,500
        type: 'expense',
        category: 'Health',
        date: dPrev(22),
        description: 'Cleaning and checkup',
        createdAt: Date.now() - 22000000
      }
    ];

    state.transactions = sampleTxns;
    state.budgets = {
      overallPaise: 6500000,
      categories: {
        Food: 1500000,
        Bills: 1200000,
        Shopping: 1000000,
        Entertainment: 500000,
        Travel: 600000
      }
    };
    state.settings.hasInitialized = true;

    saveToStorage();
    renderAll();

    if (showNotification) {
      showToast('Sample dataset loaded successfully (₹ values populated)', 'success');
    }
  }

  function clearAllData() {
    state.transactions = [];
    state.budgets = {
      overallPaise: 5000000,
      categories: {}
    };
    saveToStorage();
    renderAll();
    showToast('All transaction and budget records have been cleared', 'info');
  }

  // --- Calculations ---

  function calculateTotals(txns = state.transactions) {
    let incomePaise = 0;
    let expensePaise = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const t of txns) {
      if (t.type === 'income') {
        incomePaise += t.amountPaise;
        incomeCount++;
      } else if (t.type === 'expense') {
        expensePaise += t.amountPaise;
        expenseCount++;
      }
    }

    const netPaise = incomePaise - expensePaise;
    return {
      incomePaise,
      expensePaise,
      netPaise,
      incomeCount,
      expenseCount
    };
  }

  function getCurrentMonthStats() {
    const curYM = getCurrentYearMonth();
    const curMonthTxns = state.transactions.filter(t => t.date && t.date.startsWith(curYM));

    let incomePaise = 0;
    let expensePaise = 0;
    const categoryExpenses = {};

    for (const cat of VALID_CATEGORIES) {
      categoryExpenses[cat] = 0;
    }

    for (const t of curMonthTxns) {
      if (t.type === 'income') {
        incomePaise += t.amountPaise;
      } else if (t.type === 'expense') {
        expensePaise += t.amountPaise;
        if (categoryExpenses[t.category] !== undefined) {
          categoryExpenses[t.category] += t.amountPaise;
        } else {
          categoryExpenses[t.category] = t.amountPaise;
        }
      }
    }

    const overallLimit = state.budgets.overallPaise || 0;
    const remainingBudgetPaise = overallLimit - expensePaise;
    const utilPercent = overallLimit > 0 ? Math.round((expensePaise / overallLimit) * 100) : 0;

    return {
      curYM,
      curMonthTxns,
      incomePaise,
      expensePaise,
      categoryExpenses,
      overallLimit,
      remainingBudgetPaise,
      utilPercent
    };
  }

  function getPreviousMonthStats() {
    const prevYM = getPreviousYearMonth();
    const prevMonthTxns = state.transactions.filter(t => t.date && t.date.startsWith(prevYM));

    let incomePaise = 0;
    let expensePaise = 0;

    for (const t of prevMonthTxns) {
      if (t.type === 'income') {
        incomePaise += t.amountPaise;
      } else if (t.type === 'expense') {
        expensePaise += t.amountPaise;
      }
    }

    return {
      prevYM,
      prevMonthTxns,
      incomePaise,
      expensePaise
    };
  }

  // --- Rule-Based Smart Spending Insights ---

  function generateRuleBasedInsights() {
    const curStats = getCurrentMonthStats();
    const prevStats = getPreviousMonthStats();
    const insights = [];

    const now = new Date();
    const daysPassed = Math.max(1, now.getDate());
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // 1. Highest Spending Category this month
    let topCat = null;
    let topCatPaise = 0;
    for (const [cat, paise] of Object.entries(curStats.categoryExpenses)) {
      if (paise > topCatPaise) {
        topCatPaise = paise;
        topCat = cat;
      }
    }

    if (topCat && topCatPaise > 0) {
      const shareOfTotal = curStats.expensePaise > 0
        ? Math.round((topCatPaise / curStats.expensePaise) * 100)
        : 0;

      insights.push({
        type: 'top_category',
        colorClass: 'insight-emerald',
        icon: CATEGORY_ICONS[topCat] || 'tag',
        label: 'Top Spending Category',
        headline: `${topCat} (${formatINR(topCatPaise, false)})`,
        detail: `Represents ${shareOfTotal}% of total expenditures this month across ${daysPassed} days.`
      });
    } else {
      insights.push({
        type: 'top_category',
        colorClass: 'insight-emerald',
        icon: 'check-circle',
        label: 'Top Spending Category',
        headline: 'No Expenses Recorded',
        detail: 'Log your daily purchases to calculate top spending distribution.'
      });
    }

    // 2. Average Daily Spending this month
    if (curStats.expensePaise > 0) {
      const avgDailyPaise = Math.round(curStats.expensePaise / daysPassed);
      const projectedMonthPaise = avgDailyPaise * totalDaysInMonth;
      insights.push({
        type: 'daily_burn',
        colorClass: 'insight-blue',
        icon: 'calendar-days',
        label: 'Average Daily Spending',
        headline: `${formatINR(avgDailyPaise)} / day`,
        detail: `Projected month-end expenditure: ${formatINR(projectedMonthPaise, false)} at current pace.`
      });
    } else {
      insights.push({
        type: 'daily_burn',
        colorClass: 'insight-blue',
        icon: 'calendar-days',
        label: 'Average Daily Spending',
        headline: '₹0.00 / day',
        detail: 'Daily expense velocity will update as transactions are added.'
      });
    }

    // 3. Month-over-Month Spending Velocity
    if (prevStats.expensePaise > 0 && curStats.expensePaise > 0) {
      const diffPaise = curStats.expensePaise - prevStats.expensePaise;
      const pctChange = Math.round((diffPaise / prevStats.expensePaise) * 100);
      const isUp = pctChange > 0;
      insights.push({
        type: 'mom_velocity',
        colorClass: isUp ? 'insight-amber' : 'insight-emerald',
        icon: isUp ? 'trending-up' : 'trending-down',
        label: 'Month-Over-Month Change',
        headline: `${isUp ? '+' : ''}${pctChange}% vs Last Month`,
        detail: isUp
          ? `Spending increased by ${formatINR(Math.abs(diffPaise), false)} compared to ${formatMonthName(prevStats.prevYM)}.`
          : `Spending is lower by ${formatINR(Math.abs(diffPaise), false)} compared to ${formatMonthName(prevStats.prevYM)}.`
      });
    } else {
      insights.push({
        type: 'mom_velocity',
        colorClass: 'insight-blue',
        icon: 'bar-chart-2',
        label: 'Prior Period Comparison',
        headline: 'Baseline In Progress',
        detail: `Compare ${formatMonthName(curStats.curYM)} with prior months as historical data builds up.`
      });
    }

    // 4. Heavy Concentration Warning (if one category > 40% of spending)
    if (topCat && topCatPaise > 0 && curStats.expensePaise > 0) {
      const concentration = (topCatPaise / curStats.expensePaise) * 100;
      if (concentration >= 40) {
        insights.push({
          type: 'concentration_alert',
          colorClass: 'insight-rose',
          icon: 'alert-triangle',
          label: 'Category Spike Warning',
          headline: `${topCat} at ${Math.round(concentration)}% of Budget`,
          detail: `A single category accounts for an unusually large proportion of total monthly spending.`
        });
      }
    }

    // 5. Overall Budget Runway Insight
    if (curStats.overallLimit > 0) {
      if (curStats.utilPercent >= 100) {
        insights.push({
          type: 'budget_runway',
          colorClass: 'insight-rose',
          icon: 'alert-octagon',
          label: 'Budget Runway',
          headline: `Limit Breached by ${formatINR(Math.abs(curStats.remainingBudgetPaise), false)}`,
          detail: 'Monthly budget has been exceeded. Curtail discretionary expenses.'
        });
      } else if (curStats.utilPercent >= 80) {
        insights.push({
          type: 'budget_runway',
          colorClass: 'insight-amber',
          icon: 'alert-circle',
          label: 'Budget Runway',
          headline: `${100 - curStats.utilPercent}% Safe Spend Left`,
          detail: `${formatINR(curStats.remainingBudgetPaise, false)} remaining with ${totalDaysInMonth - daysPassed} days left in the month.`
        });
      } else {
        insights.push({
          type: 'budget_runway',
          colorClass: 'insight-emerald',
          icon: 'shield-check',
          label: 'Budget Status',
          headline: `${curStats.utilPercent}% Budget Utilized`,
          detail: `${formatINR(curStats.remainingBudgetPaise, false)} remaining for the rest of this month.`
        });
      }
    }

    return insights;
  }

  // --- Rendering UI Sections ---

  function renderDashboard() {
    const totals = calculateTotals();
    const curMonth = getCurrentMonthStats();

    // Summary Cards
    const elNet = document.getElementById('statNetBalance');
    const elIncome = document.getElementById('statTotalIncome');
    const elExpense = document.getElementById('statTotalExpenses');
    const elBudgetRemaining = document.getElementById('statMonthlyBudgetRemaining');
    const elBalanceStatus = document.getElementById('statBalanceStatus');
    const elIncomeCount = document.getElementById('statIncomeCount');
    const elExpenseCount = document.getElementById('statExpenseCount');
    const elBudgetMiniBar = document.getElementById('statBudgetMiniBar');
    const elBudgetUtilText = document.getElementById('statBudgetUtilText');

    if (elNet) elNet.textContent = formatINR(totals.netPaise);
    if (elIncome) elIncome.textContent = formatINR(totals.incomePaise);
    if (elExpense) elExpense.textContent = formatINR(totals.expensePaise);
    if (elIncomeCount) elIncomeCount.textContent = `${totals.incomeCount} credits recorded`;
    if (elExpenseCount) elExpenseCount.textContent = `${totals.expenseCount} debits recorded`;

    if (elBalanceStatus) {
      if (totals.netPaise >= 0) {
        elBalanceStatus.className = 'trend-badge';
        elBalanceStatus.innerHTML = '<i data-lucide="shield-check"></i> <span>Healthy Cashflow</span>';
      } else {
        elBalanceStatus.className = 'trend-badge text-expense';
        elBalanceStatus.innerHTML = '<i data-lucide="alert-circle"></i> <span>Negative Balance</span>';
      }
    }

    if (elBudgetRemaining) {
      elBudgetRemaining.textContent = formatINR(curMonth.remainingBudgetPaise);
      if (curMonth.remainingBudgetPaise < 0) {
        elBudgetRemaining.classList.add('text-expense');
      } else {
        elBudgetRemaining.classList.remove('text-expense');
      }
    }

    if (elBudgetMiniBar) {
      const clampWidth = Math.min(100, Math.max(0, curMonth.utilPercent));
      elBudgetMiniBar.style.width = `${clampWidth}%`;
      if (curMonth.utilPercent >= 100) {
        elBudgetMiniBar.style.backgroundColor = 'var(--expense-color)';
      } else if (curMonth.utilPercent >= 80) {
        elBudgetMiniBar.style.backgroundColor = 'var(--warning-color)';
      } else {
        elBudgetMiniBar.style.backgroundColor = 'var(--emerald-600)';
      }
    }

    if (elBudgetUtilText) {
      elBudgetUtilText.textContent = `${curMonth.utilPercent}% of monthly budget used`;
    }

    // Budget Alert Banner
    const alertBanner = document.getElementById('budgetAlertBanner');
    const alertTitle = document.getElementById('budgetAlertTitle');
    const alertMsg = document.getElementById('budgetAlertMessage');

    if (alertBanner && curMonth.overallLimit > 0) {
      if (curMonth.utilPercent >= 100) {
        alertBanner.style.display = 'flex';
        alertBanner.className = 'budget-alert-banner alert-danger';
        alertTitle.textContent = 'Budget Threshold Exceeded!';
        alertMsg.textContent = `You have spent ${formatINR(curMonth.expensePaise, false)}, exceeding your monthly ceiling of ${formatINR(curMonth.overallLimit, false)} by ${formatINR(Math.abs(curMonth.remainingBudgetPaise), false)}.`;
      } else if (curMonth.utilPercent >= 80) {
        alertBanner.style.display = 'flex';
        alertBanner.className = 'budget-alert-banner';
        alertTitle.textContent = 'High Budget Utilization Warning';
        alertMsg.textContent = `You have reached ${curMonth.utilPercent}% of your monthly limit. Remaining safe spend is ${formatINR(curMonth.remainingBudgetPaise, false)}.`;
      } else {
        alertBanner.style.display = 'none';
      }
    }

    // Insights Grid
    renderInsights();

    // Recent Transactions Table (latest 5)
    renderRecentTransactions();

    // Render Dashboard Charts
    renderDashboardCharts();
  }

  function renderInsights() {
    const grid = document.getElementById('insightsGrid');
    if (!grid) return;

    const insights = generateRuleBasedInsights();
    grid.innerHTML = insights.map(item => `
      <div class="insight-card ${item.colorClass}">
        <div class="insight-card-header">
          <div class="insight-icon">
            <i data-lucide="${item.icon}"></i>
          </div>
          <span class="insight-type-label">${escapeHtml(item.label)}</span>
        </div>
        <div class="insight-headline">${escapeHtml(item.headline)}</div>
        <div class="insight-detail">${escapeHtml(item.detail)}</div>
      </div>
    `).join('');

    lucide.createIcons();
  }

  function renderRecentTransactions() {
    const tbody = document.getElementById('dashboardTxnTableBody');
    const emptyState = document.getElementById('dashboardEmptyTxn');
    const table = document.getElementById('dashboardTxnTable');

    if (!tbody) return;

    // Sort by date desc
    const sorted = [...state.transactions].sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      return dateDiff !== 0 ? dateDiff : b.createdAt - a.createdAt;
    });

    const recent = sorted.slice(0, 5);

    if (recent.length === 0) {
      tbody.innerHTML = '';
      if (table) table.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (table) table.style.display = 'table';
    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = recent.map(t => createTxnRowHtml(t)).join('');
    lucide.createIcons();
  }

  function createTxnRowHtml(t) {
    const isIncome = t.type === 'income';
    const amountSign = isIncome ? '+' : '-';
    const amountClass = isIncome ? 'text-income' : 'text-expense';
    const catClass = `cat-${t.category}`;
    const catIcon = CATEGORY_ICONS[t.category] || 'tag';

    return `
      <tr data-txn-id="${t.id}">
        <td class="txn-date-cell">${formatHumanDate(t.date)}</td>
        <td>
          <div class="txn-title-cell">
            <span class="txn-title">${escapeHtml(t.title)}</span>
            ${t.description ? `<span class="txn-desc" title="${escapeHtml(t.description)}">${escapeHtml(t.description)}</span>` : ''}
          </div>
        </td>
        <td>
          <span class="category-badge ${catClass}">
            <i data-lucide="${catIcon}"></i>
            <span>${escapeHtml(t.category)}</span>
          </span>
        </td>
        <td>
          <span class="type-badge ${isIncome ? 'type-income' : 'type-expense'}">
            ${isIncome ? 'Income' : 'Expense'}
          </span>
        </td>
        <td class="text-right txn-amount-cell ${amountClass}">
          ${amountSign}${formatINR(t.amountPaise)}
        </td>
        <td class="text-center">
          <div class="row-actions">
            <button class="action-btn" title="Edit" onclick="SpendWise.openTransactionModal('${t.id}')">
              <i data-lucide="edit-2"></i>
            </button>
            <button class="action-btn action-delete" title="Delete" onclick="SpendWise.confirmDeleteTransaction('${t.id}')">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderTransactionsView() {
    const tbody = document.getElementById('transactionsTableBody');
    const emptyState = document.getElementById('txnEmptyState');
    const table = document.getElementById('transactionsFullTable');
    const paginationBar = document.getElementById('paginationBar');
    const navTxnCount = document.getElementById('navTxnCount');

    if (navTxnCount) {
      navTxnCount.textContent = state.transactions.length;
    }

    if (!tbody) return;

    // Apply Filters
    let filtered = state.transactions.filter(t => {
      // Type
      if (state.filter.type !== 'all' && t.type !== state.filter.type) {
        return false;
      }
      // Category
      if (state.filter.category !== 'all' && t.category !== state.filter.category) {
        return false;
      }
      // Date start
      if (state.filter.startDate && t.date < state.filter.startDate) {
        return false;
      }
      // Date end
      if (state.filter.endDate && t.date > state.filter.endDate) {
        return false;
      }
      // Search query (title, description, category)
      if (state.filter.search) {
        const q = state.filter.search.toLowerCase();
        const matchesTitle = t.title && t.title.toLowerCase().includes(q);
        const matchesDesc = t.description && t.description.toLowerCase().includes(q);
        const matchesCat = t.category && t.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCat) {
          return false;
        }
      }
      return true;
    });

    // Apply Sort
    filtered.sort((a, b) => {
      switch (state.filter.sort) {
        case 'date-desc': {
          const dDiff = new Date(b.date) - new Date(a.date);
          return dDiff !== 0 ? dDiff : b.createdAt - a.createdAt;
        }
        case 'date-asc': {
          const dDiff = new Date(a.date) - new Date(b.date);
          return dDiff !== 0 ? dDiff : a.createdAt - b.createdAt;
        }
        case 'amount-desc':
          return b.amountPaise - a.amountPaise;
        case 'amount-asc':
          return a.amountPaise - b.amountPaise;
        default:
          return 0;
      }
    });

    const totalCount = filtered.length;

    if (totalCount === 0) {
      tbody.innerHTML = '';
      if (table) table.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      if (paginationBar) paginationBar.style.display = 'none';
      return;
    }

    if (table) table.style.display = 'table';
    if (emptyState) emptyState.style.display = 'none';
    if (paginationBar) paginationBar.style.display = 'flex';

    // Pagination Calculation
    const rowsPerPage = state.pagination.rowsPerPage;
    const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;
    if (state.pagination.page > totalPages) {
      state.pagination.page = totalPages;
    }
    const startIndex = (state.pagination.page - 1) * rowsPerPage;
    const pageItems = filtered.slice(startIndex, startIndex + rowsPerPage);

    tbody.innerHTML = pageItems.map(t => createTxnRowHtml(t)).join('');

    // Update Pagination UI
    const paginationInfo = document.getElementById('paginationInfo');
    const pageCurrentDisplay = document.getElementById('pageCurrentDisplay');
    const btnPagePrev = document.getElementById('btnPagePrev');
    const btnPageNext = document.getElementById('btnPageNext');

    const endItemIndex = Math.min(startIndex + rowsPerPage, totalCount);
    if (paginationInfo) {
      paginationInfo.textContent = `Showing ${startIndex + 1}-${endItemIndex} of ${totalCount} transactions`;
    }
    if (pageCurrentDisplay) {
      pageCurrentDisplay.textContent = `${state.pagination.page} / ${totalPages}`;
    }
    if (btnPagePrev) {
      btnPagePrev.disabled = state.pagination.page <= 1;
    }
    if (btnPageNext) {
      btnPageNext.disabled = state.pagination.page >= totalPages;
    }

    lucide.createIcons();
  }

  function renderBudgetsView() {
    const curMonth = getCurrentMonthStats();

    // Overall Monthly Card
    const elLimit = document.getElementById('overallBudgetLimitDisplay');
    const elSpent = document.getElementById('overallBudgetSpentDisplay');
    const elRemaining = document.getElementById('overallBudgetRemainingDisplay');
    const elPercent = document.getElementById('overallBudgetPercentDisplay');
    const elBar = document.getElementById('overallProgressBar');
    const elMonthTag = document.getElementById('currentBudgetMonthDisplay');
    const elStatusMsg = document.getElementById('overallBudgetStatusMessage');

    if (elMonthTag) {
      elMonthTag.textContent = formatMonthName(curMonth.curYM);
    }

    if (elLimit) elLimit.textContent = formatINR(curMonth.overallLimit, false);
    if (elSpent) elSpent.textContent = formatINR(curMonth.expensePaise);

    if (elRemaining) {
      elRemaining.textContent = formatINR(curMonth.remainingBudgetPaise);
      if (curMonth.remainingBudgetPaise < 0) {
        elRemaining.className = 'b-value text-expense';
      } else {
        elRemaining.className = 'b-value text-emerald';
      }
    }

    if (elPercent) {
      elPercent.textContent = `${curMonth.utilPercent}%`;
    }

    if (elBar) {
      const clampW = Math.min(100, Math.max(0, curMonth.utilPercent));
      elBar.style.width = `${clampW}%`;
      elBar.classList.remove('warning-fill', 'danger-fill');

      if (curMonth.utilPercent >= 100) {
        elBar.classList.add('danger-fill');
      } else if (curMonth.utilPercent >= 80) {
        elBar.classList.add('warning-fill');
      }
    }

    if (elStatusMsg) {
      elStatusMsg.className = 'budget-status-alert';
      if (curMonth.utilPercent >= 100) {
        elStatusMsg.classList.add('alert-danger');
        elStatusMsg.innerHTML = `
          <i data-lucide="alert-octagon"></i>
          <span>Exceeded overall ceiling by ${formatINR(Math.abs(curMonth.remainingBudgetPaise), false)}. Avoid new discretionary spends.</span>
        `;
      } else if (curMonth.utilPercent >= 80) {
        elStatusMsg.classList.add('alert-warning');
        elStatusMsg.innerHTML = `
          <i data-lucide="alert-triangle"></i>
          <span>Warning: ${curMonth.utilPercent}% of monthly ceiling used. You have ${formatINR(curMonth.remainingBudgetPaise, false)} remaining.</span>
        `;
      } else {
        elStatusMsg.innerHTML = `
          <i data-lucide="check-circle-2"></i>
          <span>Healthy pacing: Spending is currently within the allocated budget limit.</span>
        `;
      }
    }

    // Category Budgets Grid
    renderCategoryBudgetsGrid(curMonth);
  }

  function renderCategoryBudgetsGrid(curMonth) {
    const grid = document.getElementById('categoryBudgetsGrid');
    const emptyState = document.getElementById('emptyCategoryBudgets');
    if (!grid) return;

    const catBudgetKeys = Object.keys(state.budgets.categories || {});

    if (catBudgetKeys.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = catBudgetKeys.map(cat => {
      const limitPaise = state.budgets.categories[cat] || 0;
      const spentPaise = curMonth.categoryExpenses[cat] || 0;
      const remainPaise = limitPaise - spentPaise;
      const percent = limitPaise > 0 ? Math.round((spentPaise / limitPaise) * 100) : 0;
      const clampWidth = Math.min(100, Math.max(0, percent));

      let percentClass = 'c-percent';
      let barColor = 'var(--emerald-600)';

      if (percent >= 100) {
        percentClass = 'c-percent danger-text';
        barColor = 'var(--expense-color)';
      } else if (percent >= 80) {
        percentClass = 'c-percent warning-text';
        barColor = 'var(--warning-color)';
      }

      const catIcon = CATEGORY_ICONS[cat] || 'tag';

      return `
        <div class="cat-budget-card">
          <div class="cat-budget-card-header">
            <div class="cat-budget-meta">
              <span class="category-badge cat-${cat}">
                <i data-lucide="${catIcon}"></i>
                <span>${escapeHtml(cat)}</span>
              </span>
            </div>
            <div class="cat-budget-actions">
              <button class="action-btn" title="Edit Budget" onclick="SpendWise.openCategoryBudgetModal('${escapeHtml(cat)}')">
                <i data-lucide="edit-2"></i>
              </button>
              <button class="action-btn action-delete" title="Delete Budget" onclick="SpendWise.confirmDeleteCategoryBudget('${escapeHtml(cat)}')">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>

          <div class="cat-budget-numbers">
            <span class="c-spent">${formatINR(spentPaise, false)}</span>
            <span class="c-limit">of ${formatINR(limitPaise, false)} limit</span>
          </div>

          <div class="cat-budget-bar-track">
            <div class="cat-budget-bar-fill" style="width: ${clampWidth}%; background-color: ${barColor};"></div>
          </div>

          <div class="cat-budget-footer">
            <span class="c-remain">
              ${remainPaise < 0 ? 'Over limit by ' + formatINR(Math.abs(remainPaise), false) : formatINR(remainPaise, false) + ' left'}
            </span>
            <span class="${percentClass}">
              ${percent}% used
            </span>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();
  }

  function renderAnalyticsView() {
    const period = state.analyticsPeriod;
    const periodLabel = document.getElementById('analyticsPeriodRangeLabel');

    // Filter transactions for period
    const now = new Date();
    let startDateStr = '';
    let endDateStr = formatDateKey(now);

    if (period === 'current-month') {
      const curYM = getCurrentYearMonth();
      startDateStr = `${curYM}-01`;
      if (periodLabel) periodLabel.textContent = `Showing Current Month (${formatMonthName(curYM)})`;
    } else if (period === 'last-month') {
      const prevYM = getPreviousYearMonth();
      const [py, pm] = prevYM.split('-');
      const lastDay = new Date(py, pm, 0).getDate();
      startDateStr = `${prevYM}-01`;
      endDateStr = `${prevYM}-${String(lastDay).padStart(2, '0')}`;
      if (periodLabel) periodLabel.textContent = `Showing Last Month (${formatMonthName(prevYM)})`;
    } else if (period === 'last-3-months') {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      startDateStr = formatDateKey(d);
      if (periodLabel) periodLabel.textContent = 'Showing Last 3 Months';
    } else if (period === 'last-6-months') {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      startDateStr = formatDateKey(d);
      if (periodLabel) periodLabel.textContent = 'Showing Last 6 Months';
    } else {
      startDateStr = '2000-01-01';
      if (periodLabel) periodLabel.textContent = 'Showing All Time Records';
    }

    const filtered = state.transactions.filter(t => {
      if (!t.date) return false;
      return t.date >= startDateStr && t.date <= endDateStr;
    });

    const totals = calculateTotals(filtered);
    const savingsPaise = totals.incomePaise - totals.expensePaise;
    const savingsRate = totals.incomePaise > 0
      ? Math.max(0, Math.round((savingsPaise / totals.incomePaise) * 100))
      : 0;

    const elPeriodExp = document.getElementById('analyticsPeriodExpenses');
    const elPeriodInc = document.getElementById('analyticsPeriodIncome');
    const elPeriodSav = document.getElementById('analyticsPeriodSavings');
    const elPeriodRate = document.getElementById('analyticsPeriodSavingsRate');

    if (elPeriodExp) elPeriodExp.textContent = formatINR(totals.expensePaise);
    if (elPeriodInc) elPeriodInc.textContent = formatINR(totals.incomePaise);
    if (elPeriodSav) {
      elPeriodSav.textContent = formatINR(savingsPaise);
      if (savingsPaise < 0) {
        elPeriodSav.classList.add('text-expense');
      } else {
        elPeriodSav.classList.remove('text-expense');
      }
    }
    if (elPeriodRate) elPeriodRate.textContent = `${savingsRate}%`;

    // Render Analytics Charts
    renderAnalyticsCharts(filtered);
  }

  // --- Chart.js Rendering ---

  function isDarkTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function getChartThemeColors() {
    const isDark = isDarkTheme();
    return {
      textColor: isDark ? '#94a3b8' : '#475569',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      tooltipBg: isDark ? '#1e293b' : '#0f172a',
      tooltipText: '#ffffff'
    };
  }

  function destroyChart(name) {
    if (state.chartInstances[name]) {
      state.chartInstances[name].destroy();
      delete state.chartInstances[name];
    }
  }

  function renderDashboardCharts() {
    const theme = getChartThemeColors();

    // 1. Dashboard Trend Chart (past 6 calendar months: income vs expense)
    const trendCanvas = document.getElementById('dashboardTrendChart');
    if (trendCanvas) {
      destroyChart('dashTrend');

      // Aggregate past 6 months
      const months = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push({
          key: ym,
          label: d.toLocaleDateString('en-IN', { month: 'short' }),
          incomePaise: 0,
          expensePaise: 0
        });
      }

      state.transactions.forEach(t => {
        if (!t.date) return;
        const ym = t.date.substring(0, 7);
        const mObj = months.find(m => m.key === ym);
        if (mObj) {
          if (t.type === 'income') mObj.incomePaise += t.amountPaise;
          if (t.type === 'expense') mObj.expensePaise += t.amountPaise;
        }
      });

      const labels = months.map(m => m.label);
      const incomeData = months.map(m => m.incomePaise / 100);
      const expenseData = months.map(m => m.expensePaise / 100);

      const ctx = trendCanvas.getContext('2d');
      state.chartInstances['dashTrend'] = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Income (₹)',
              data: incomeData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: true,
              tension: 0.35,
              borderWidth: 2.5,
              pointRadius: 4,
              pointHoverRadius: 6
            },
            {
              label: 'Expenses (₹)',
              data: expenseData,
              borderColor: '#f43f5e',
              backgroundColor: 'rgba(244, 63, 94, 0.08)',
              fill: true,
              tension: 0.35,
              borderWidth: 2.5,
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: theme.textColor,
                usePointStyle: true,
                padding: 16
              }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.tooltipText,
              bodyColor: theme.tooltipText,
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: {
              grid: { color: theme.gridColor },
              ticks: { color: theme.textColor }
            },
            y: {
              grid: { color: theme.gridColor },
              ticks: {
                color: theme.textColor,
                callback: (val) => '₹' + Number(val).toLocaleString('en-IN')
              }
            }
          }
        }
      });
    }

    // 2. Dashboard Category Doughnut Chart (current month)
    const catCanvas = document.getElementById('dashboardCategoryChart');
    if (catCanvas) {
      destroyChart('dashCat');

      const curMonth = getCurrentMonthStats();
      const labels = [];
      const data = [];
      const bgColors = [];

      for (const [cat, paise] of Object.entries(curMonth.categoryExpenses)) {
        if (paise > 0) {
          labels.push(cat);
          data.push(paise / 100);
          bgColors.push(CATEGORY_COLORS[cat] || '#94a3b8');
        }
      }

      const hasData = data.length > 0;
      const ctx = catCanvas.getContext('2d');

      state.chartInstances['dashCat'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: hasData ? labels : ['No Expenses Yet'],
          datasets: [{
            data: hasData ? data : [1],
            backgroundColor: hasData ? bgColors : ['#e2e8f0'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: theme.textColor,
                boxWidth: 12,
                padding: 12
              }
            },
            tooltip: {
              enabled: hasData,
              backgroundColor: theme.tooltipBg,
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ₹${Number(ctx.parsed).toLocaleString('en-IN')}`
              }
            }
          },
          cutout: '70%'
        }
      });
    }
  }

  function renderAnalyticsCharts(filteredTransactions) {
    const theme = getChartThemeColors();

    // 1. Doughnut: Spending by category for period
    const catCanvas = document.getElementById('analyticsCategoryDoughnut');
    const tableBody = document.getElementById('analyticsCategoryBreakdownBody');

    if (catCanvas) {
      destroyChart('analyticsCat');

      const catTotals = {};
      let totalExpensePaise = 0;

      VALID_CATEGORIES.forEach(c => { catTotals[c] = 0; });

      filteredTransactions.forEach(t => {
        if (t.type === 'expense') {
          catTotals[t.category] = (catTotals[t.category] || 0) + t.amountPaise;
          totalExpensePaise += t.amountPaise;
        }
      });

      const labels = [];
      const data = [];
      const bgColors = [];
      const breakdownRows = [];

      for (const [cat, paise] of Object.entries(catTotals)) {
        if (paise > 0) {
          labels.push(cat);
          data.push(paise / 100);
          bgColors.push(CATEGORY_COLORS[cat] || '#94a3b8');

          const share = totalExpensePaise > 0 ? Math.round((paise / totalExpensePaise) * 100) : 0;
          breakdownRows.push({
            cat,
            paise,
            share
          });
        }
      }

      // Sort breakdown descending
      breakdownRows.sort((a, b) => b.paise - a.paise);

      if (tableBody) {
        if (breakdownRows.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="3" class="text-center" style="color: var(--text-muted); padding: 18px;">No expenses for this period.</td></tr>`;
        } else {
          tableBody.innerHTML = breakdownRows.map(r => `
            <tr>
              <td>
                <span class="category-badge cat-${r.cat}">
                  <i data-lucide="${CATEGORY_ICONS[r.cat] || 'tag'}"></i>
                  <span>${escapeHtml(r.cat)}</span>
                </span>
              </td>
              <td class="text-right font-weight-bold">${formatINR(r.paise, false)}</td>
              <td class="text-right text-emerald font-weight-bold">${r.share}%</td>
            </tr>
          `).join('');
          lucide.createIcons();
        }
      }

      const hasData = data.length > 0;
      const ctx = catCanvas.getContext('2d');

      state.chartInstances['analyticsCat'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: hasData ? labels : ['No Expense Records'],
          datasets: [{
            data: hasData ? data : [1],
            backgroundColor: hasData ? bgColors : ['#cbd5e1'],
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: theme.textColor,
                boxWidth: 12,
                padding: 10
              }
            },
            tooltip: {
              enabled: hasData,
              backgroundColor: theme.tooltipBg,
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ₹${Number(ctx.parsed).toLocaleString('en-IN')}`
              }
            }
          },
          cutout: '65%'
        }
      });
    }

    // 2. Line Chart: Cashflow over time
    const cashFlowCanvas = document.getElementById('analyticsCashFlowLine');
    if (cashFlowCanvas) {
      destroyChart('analyticsCashFlow');

      // Group chronological dates or months
      const dateMap = {};
      filteredTransactions.forEach(t => {
        if (!t.date) return;
        if (!dateMap[t.date]) {
          dateMap[t.date] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') dateMap[t.date].income += t.amountPaise;
        if (t.type === 'expense') dateMap[t.date].expense += t.amountPaise;
      });

      const sortedDates = Object.keys(dateMap).sort();
      const labels = sortedDates.map(d => formatHumanDate(d));
      const incomeData = sortedDates.map(d => dateMap[d].income / 100);
      const expenseData = sortedDates.map(d => dateMap[d].expense / 100);

      const ctx = cashFlowCanvas.getContext('2d');
      state.chartInstances['analyticsCashFlow'] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels.length > 0 ? labels : ['No Transactions'],
          datasets: [
            {
              label: 'Income (₹)',
              data: incomeData.length > 0 ? incomeData : [0],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: true,
              tension: 0.3,
              borderWidth: 2
            },
            {
              label: 'Expenses (₹)',
              data: expenseData.length > 0 ? expenseData : [0],
              borderColor: '#f43f5e',
              backgroundColor: 'rgba(244, 63, 94, 0.08)',
              fill: true,
              tension: 0.3,
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: theme.textColor, usePointStyle: true }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ₹${Number(ctx.parsed.y).toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: {
              grid: { color: theme.gridColor },
              ticks: { color: theme.textColor }
            },
            y: {
              grid: { color: theme.gridColor },
              ticks: {
                color: theme.textColor,
                callback: (val) => '₹' + Number(val).toLocaleString('en-IN')
              }
            }
          }
        }
      });
    }

    // 3. Bar Chart: Monthly Expenses Comparison across all data
    const barCanvas = document.getElementById('analyticsMonthlyExpenseBar');
    if (barCanvas) {
      destroyChart('analyticsMonthBar');

      const monthMap = {};
      state.transactions.forEach(t => {
        if (!t.date || t.type !== 'expense') return;
        const ym = t.date.substring(0, 7);
        monthMap[ym] = (monthMap[ym] || 0) + t.amountPaise;
      });

      const sortedYMs = Object.keys(monthMap).sort();
      const labels = sortedYMs.map(ym => formatMonthName(ym));
      const expData = sortedYMs.map(ym => monthMap[ym] / 100);

      const ctx = barCanvas.getContext('2d');
      state.chartInstances['analyticsMonthBar'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels.length > 0 ? labels : ['No Data'],
          datasets: [{
            label: 'Total Expenses (₹)',
            data: expData.length > 0 ? expData : [0],
            backgroundColor: '#059669',
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: theme.textColor }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              callbacks: {
                label: (ctx) => ` Monthly Expenses: ₹${Number(ctx.parsed.y).toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: {
              grid: { color: theme.gridColor },
              ticks: { color: theme.textColor }
            },
            y: {
              grid: { color: theme.gridColor },
              ticks: {
                color: theme.textColor,
                callback: (val) => '₹' + Number(val).toLocaleString('en-IN')
              }
            }
          }
        }
      });
    }
  }

  // --- Views Navigation Router ---

  function switchView(viewName) {
    if (!['dashboard', 'transactions', 'budgets', 'analytics', 'data'].includes(viewName)) {
      viewName = 'dashboard';
    }

    state.currentView = viewName;

    // Toggle panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    const targetPanel = document.getElementById(`view-${viewName}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    // Toggle sidebar nav items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    // Toggle mobile bottom nav buttons
    document.querySelectorAll('.mobile-bottom-nav .mobile-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    // Update Header Titles
    const titles = {
      dashboard: {
        title: 'Dashboard Overview',
        sub: 'Track your personal cash flow, spending limits, and financial metrics'
      },
      transactions: {
        title: 'Transactions Ledger',
        sub: 'Search, filter, categorize, and inspect all cash flow transactions'
      },
      budgets: {
        title: 'Budget Management',
        sub: 'Establish spending limits and receive automated utilization alerts'
      },
      analytics: {
        title: 'Financial Analytics',
        sub: 'Visual insights, category allocations, and long-term spending patterns'
      },
      data: {
        title: 'Data Management & Archival',
        sub: 'Export CSV records, download JSON backups, and manage local storage'
      }
    };

    const headerTitle = document.getElementById('pageTitle');
    const headerSub = document.getElementById('pageSubtitle');
    if (headerTitle && titles[viewName]) {
      headerTitle.textContent = titles[viewName].title;
    }
    if (headerSub && titles[viewName]) {
      headerSub.textContent = titles[viewName].sub;
    }

    // Render corresponding view
    if (viewName === 'dashboard') renderDashboard();
    else if (viewName === 'transactions') renderTransactionsView();
    else if (viewName === 'budgets') renderBudgetsView();
    else if (viewName === 'analytics') renderAnalyticsView();

    window.scrollTo({ top: 0, behavior: 'smooth' });
    lucide.createIcons();
  }

  function renderAll() {
    renderDashboard();
    renderTransactionsView();
    renderBudgetsView();
    if (state.currentView === 'analytics') {
      renderAnalyticsView();
    }
  }

  // --- Modals Management ---

  function openTransactionModal(editId = null) {
    const modal = document.getElementById('modalTransaction');
    const form = document.getElementById('formTransaction');
    const modalTitle = document.getElementById('modalTxnTitle');
    const btnSaveText = document.getElementById('btnSaveTxnText');
    const editIdInput = document.getElementById('txnEditId');
    const labelExpense = document.getElementById('labelTypeExpense');
    const labelIncome = document.getElementById('labelTypeIncome');
    const badge = document.getElementById('modalTxnIconBadge');

    if (!modal || !form) return;

    form.reset();

    const todayStr = formatDateKey(new Date());

    if (editId) {
      const txn = state.transactions.find(t => t.id === editId);
      if (!txn) {
        showToast('Transaction not found', 'error');
        return;
      }

      modalTitle.textContent = 'Edit Transaction';
      btnSaveText.textContent = 'Update Transaction';
      editIdInput.value = txn.id;

      document.getElementById('txnAmount').value = paiseToRupees(txn.amountPaise);
      document.getElementById('txnTitle').value = txn.title;
      document.getElementById('txnDate').value = txn.date || todayStr;
      document.getElementById('txnCategory').value = txn.category || 'Food';
      document.getElementById('txnDescription').value = txn.description || '';

      const typeRadio = form.querySelector(`input[name="txnType"][value="${txn.type}"]`);
      if (typeRadio) typeRadio.checked = true;

      if (txn.type === 'income') {
        labelIncome.classList.add('income-active');
        labelExpense.classList.remove('expense-active');
      } else {
        labelExpense.classList.add('expense-active');
        labelIncome.classList.remove('income-active');
      }

      if (badge) {
        badge.className = txn.type === 'income' ? 'modal-icon-badge' : 'modal-icon-badge modal-icon-danger';
      }
    } else {
      modalTitle.textContent = 'Add Transaction';
      btnSaveText.textContent = 'Save Transaction';
      editIdInput.value = '';
      document.getElementById('txnDate').value = todayStr;
      document.getElementById('txnCategory').value = 'Food';

      labelExpense.classList.add('expense-active');
      labelIncome.classList.remove('income-active');
      const expRadio = form.querySelector('input[name="txnType"][value="expense"]');
      if (expRadio) expRadio.checked = true;

      if (badge) badge.className = 'modal-icon-badge modal-icon-danger';
    }

    modal.style.display = 'flex';
    document.getElementById('txnAmount').focus();
    lucide.createIcons();
  }

  function closeTransactionModal() {
    const modal = document.getElementById('modalTransaction');
    if (modal) modal.style.display = 'none';
  }

  function handleSaveTransaction(e) {
    e.preventDefault();

    const editId = document.getElementById('txnEditId').value.trim();
    const amountVal = document.getElementById('txnAmount').value.trim();
    const titleVal = document.getElementById('txnTitle').value.trim();
    const dateVal = document.getElementById('txnDate').value.trim();
    const categoryVal = document.getElementById('txnCategory').value;
    const descVal = document.getElementById('txnDescription').value.trim();
    const typeVal = document.querySelector('input[name="txnType"]:checked')?.value || 'expense';

    // Validation
    if (!titleVal) {
      showToast('Please enter a transaction title', 'error');
      document.getElementById('txnTitle').focus();
      return;
    }

    const amountPaise = rupeesToPaise(amountVal);
    if (amountPaise <= 0) {
      showToast('Please enter a valid amount greater than ₹0.00', 'error');
      document.getElementById('txnAmount').focus();
      return;
    }

    if (!dateVal || isNaN(new Date(dateVal).getTime())) {
      showToast('Please choose a valid date', 'error');
      document.getElementById('txnDate').focus();
      return;
    }

    if (!VALID_CATEGORIES.includes(categoryVal)) {
      showToast('Please choose a valid category', 'error');
      return;
    }

    if (editId) {
      // Update existing
      const idx = state.transactions.findIndex(t => t.id === editId);
      if (idx !== -1) {
        state.transactions[idx] = {
          ...state.transactions[idx],
          title: titleVal,
          amountPaise,
          type: typeVal,
          category: categoryVal,
          date: dateVal,
          description: descVal
        };
        showToast('Transaction updated successfully', 'success');
      }
    } else {
      // Add new
      const newTxn = {
        id: generateId(),
        title: titleVal,
        amountPaise,
        type: typeVal,
        category: categoryVal,
        date: dateVal,
        description: descVal,
        createdAt: Date.now()
      };
      state.transactions.unshift(newTxn);
      showToast('New transaction recorded', 'success');
    }

    saveToStorage();
    closeTransactionModal();
    renderAll();
  }

  // Confirmation Modal
  let confirmCallback = null;

  function showConfirmModal(title, message, btnText, isDanger, onConfirm) {
    const modal = document.getElementById('modalConfirm');
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl = document.getElementById('confirmModalMessage');
    const proceedBtn = document.getElementById('btnProceedConfirm');
    const proceedText = document.getElementById('btnProceedConfirmText');
    const iconBadge = document.getElementById('confirmModalIcon');

    if (!modal) return;

    titleEl.textContent = title;
    msgEl.textContent = message;
    proceedText.textContent = btnText || 'Confirm';

    if (isDanger) {
      proceedBtn.className = 'btn btn-danger';
      iconBadge.className = 'modal-icon-badge modal-icon-danger';
    } else {
      proceedBtn.className = 'btn btn-primary';
      iconBadge.className = 'modal-icon-badge';
    }

    confirmCallback = onConfirm;
    modal.style.display = 'flex';
    lucide.createIcons();
  }

  function closeConfirmModal() {
    const modal = document.getElementById('modalConfirm');
    if (modal) modal.style.display = 'none';
    confirmCallback = null;
  }

  function confirmDeleteTransaction(id) {
    const txn = state.transactions.find(t => t.id === id);
    if (!txn) return;

    showConfirmModal(
      'Delete Transaction',
      `Are you sure you want to delete "${txn.title}" (${formatINR(txn.amountPaise)})? This action cannot be undone.`,
      'Delete Permanently',
      true,
      () => {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveToStorage();
        renderAll();
        showToast('Transaction deleted', 'info');
      }
    );
  }

  // Overall Budget Modal
  function openOverallBudgetModal() {
    const modal = document.getElementById('modalOverallBudget');
    const input = document.getElementById('inputOverallBudget');
    if (!modal || !input) return;

    input.value = Math.round((state.budgets.overallPaise || 0) / 100);
    modal.style.display = 'flex';
    input.focus();
  }

  function closeOverallBudgetModal() {
    const modal = document.getElementById('modalOverallBudget');
    if (modal) modal.style.display = 'none';
  }

  function handleSaveOverallBudget(e) {
    e.preventDefault();
    const input = document.getElementById('inputOverallBudget');
    const amountVal = parseFloat(input.value);

    if (isNaN(amountVal) || amountVal < 0) {
      showToast('Please enter a valid monthly spending limit', 'error');
      return;
    }

    state.budgets.overallPaise = Math.round(amountVal * 100);
    saveToStorage();
    closeOverallBudgetModal();
    renderAll();
    showToast(`Monthly budget limit set to ${formatINR(state.budgets.overallPaise, false)}`, 'success');
  }

  // Category Budget Modal
  function openCategoryBudgetModal(editCategory = null) {
    const modal = document.getElementById('modalCategoryBudget');
    const titleEl = document.getElementById('modalCatBudgetTitle');
    const catSelect = document.getElementById('inputCategorySelect');
    const amountInput = document.getElementById('inputCategoryAmount');
    const origCategoryInput = document.getElementById('catBudgetOriginalCategory');

    if (!modal) return;

    if (editCategory && state.budgets.categories[editCategory] !== undefined) {
      titleEl.textContent = `Edit Budget for ${editCategory}`;
      origCategoryInput.value = editCategory;
      catSelect.value = editCategory;
      catSelect.disabled = true;
      amountInput.value = Math.round(state.budgets.categories[editCategory] / 100);
    } else {
      titleEl.textContent = 'Add Category Spending Limit';
      origCategoryInput.value = '';
      catSelect.disabled = false;
      // Pick first unbudgeted category if available
      const unbudgeted = VALID_CATEGORIES.find(c => state.budgets.categories[c] === undefined && !['Salary', 'Freelance'].includes(c));
      catSelect.value = unbudgeted || 'Food';
      amountInput.value = '10000';
    }

    modal.style.display = 'flex';
    amountInput.focus();
    lucide.createIcons();
  }

  function closeCategoryBudgetModal() {
    const modal = document.getElementById('modalCategoryBudget');
    if (modal) modal.style.display = 'none';
  }

  function handleSaveCategoryBudget(e) {
    e.preventDefault();
    const origCat = document.getElementById('catBudgetOriginalCategory').value;
    const catSelect = document.getElementById('inputCategorySelect');
    const amountInput = document.getElementById('inputCategoryAmount');

    const cat = origCat || catSelect.value;
    const amountVal = parseFloat(amountInput.value);

    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Please enter a valid monthly limit greater than 0', 'error');
      return;
    }

    if (!state.budgets.categories) {
      state.budgets.categories = {};
    }

    state.budgets.categories[cat] = Math.round(amountVal * 100);
    saveToStorage();
    closeCategoryBudgetModal();
    renderAll();
    showToast(`Budget limit for ${cat} set to ${formatINR(state.budgets.categories[cat], false)}`, 'success');
  }

  function confirmDeleteCategoryBudget(cat) {
    showConfirmModal(
      'Remove Category Budget',
      `Are you sure you want to remove the monthly spending limit for "${cat}"?`,
      'Remove Budget',
      true,
      () => {
        if (state.budgets.categories && state.budgets.categories[cat] !== undefined) {
          delete state.budgets.categories[cat];
          saveToStorage();
          renderAll();
          showToast(`Budget for ${cat} removed`, 'info');
        }
      }
    );
  }

  // --- Data Export & Import Handlers ---

  function exportTransactionsCsv() {
    if (state.transactions.length === 0) {
      showToast('No transactions to export', 'error');
      return;
    }

    const headers = ['ID', 'Date', 'Title', 'Type', 'Category', 'Amount (INR)', 'Amount (Paise)', 'Description'];
    const rows = state.transactions.map(t => [
      t.id,
      t.date || '',
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.type,
      t.category,
      (t.amountPaise / 100).toFixed(2),
      t.amountPaise,
      `"${(t.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpendWise_Transactions_${formatDateKey(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Transactions exported as CSV', 'success');
  }

  function exportCompleteJsonBackup() {
    const backupData = {
      app: 'SpendWise',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      transactions: state.transactions,
      budgets: state.budgets,
      settings: state.settings
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpendWise_Backup_${formatDateKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Complete JSON backup downloaded', 'success');
  }

  function handleImportJsonFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        // Validate structure
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON root format');
        }

        if (!Array.isArray(parsed.transactions)) {
          throw new Error('Backup file must contain a "transactions" array');
        }

        // Validate transactions items safely
        const validTxns = [];
        for (const item of parsed.transactions) {
          if (!item || typeof item !== 'object') continue;
          if (!item.title || typeof item.title !== 'string') continue;

          let amountPaise = 0;
          if (typeof item.amountPaise === 'number' && item.amountPaise > 0) {
            amountPaise = Math.round(item.amountPaise);
          } else if (typeof item.amount === 'number' && item.amount > 0) {
            amountPaise = Math.round(item.amount * 100);
          }

          if (amountPaise <= 0) continue;

          const type = item.type === 'income' ? 'income' : 'expense';
          const category = VALID_CATEGORIES.includes(item.category) ? item.category : 'Other';
          const date = item.date && !isNaN(new Date(item.date).getTime()) ? item.date : formatDateKey(new Date());

          validTxns.push({
            id: item.id || generateId(),
            title: item.title.trim(),
            amountPaise,
            type,
            category,
            date,
            description: (item.description || '').trim(),
            createdAt: item.createdAt || Date.now()
          });
        }

        showConfirmModal(
          'Restore Data from Backup',
          `Found ${validTxns.length} valid transactions in backup. Do you want to replace current data or merge with existing?`,
          'Replace & Restore',
          false,
          () => {
            state.transactions = validTxns;

            if (parsed.budgets && typeof parsed.budgets === 'object') {
              if (typeof parsed.budgets.overallPaise === 'number') {
                state.budgets.overallPaise = parsed.budgets.overallPaise;
              }
              if (parsed.budgets.categories && typeof parsed.budgets.categories === 'object') {
                state.budgets.categories = parsed.budgets.categories;
              }
            }

            saveToStorage();
            renderAll();
            showToast(`Successfully restored ${validTxns.length} transactions from backup`, 'success');
          }
        );
      } catch (err) {
        console.error('Import error:', err);
        showToast('Invalid backup file: ' + err.message, 'error');
      }
    };

    reader.onerror = () => {
      showToast('Error reading file from disk', 'error');
    };

    reader.readAsText(file);
  }

  // --- Theme Toggle Management ---

  function applyTheme(theme) {
    state.settings.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    saveToStorage();
    // Re-render charts with correct color tokens
    if (state.currentView === 'dashboard') {
      renderDashboardCharts();
    } else if (state.currentView === 'analytics') {
      renderAnalyticsView();
    }
  }

  function toggleTheme() {
    const nextTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    showToast(`Switched to ${nextTheme} mode`, 'info');
  }

  // --- Toast Notifications ---

  function showToast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: 'check-circle-2',
      error: 'alert-circle',
      info: 'info'
    };

    toast.innerHTML = `
      <div class="toast-icon">
        <i data-lucide="${iconMap[type] || 'info'}"></i>
      </div>
      <div class="toast-message">${escapeHtml(message)}</div>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 250);
    }, duration);
  }

  // Escape HTML helper for XSS prevention
  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Event Listeners Setup ---

  function setupEventListeners() {
    // Nav Items (Sidebar)
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        switchView(view);
      });
    });

    // Mobile Bottom Nav
    document.querySelectorAll('.mobile-bottom-nav .mobile-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        switchView(view);
      });
    });

    // Quick Add Buttons
    document.getElementById('btnQuickAdd')?.addEventListener('click', () => openTransactionModal());
    document.getElementById('btnMobileQuickAdd')?.addEventListener('click', () => openTransactionModal());
    document.getElementById('btnHeaderAdd')?.addEventListener('click', () => openTransactionModal());
    document.getElementById('btnTxnAddNew')?.addEventListener('click', () => openTransactionModal());

    // Theme Toggles
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
    document.getElementById('mobileThemeToggleBtn')?.addEventListener('click', toggleTheme);

    // Dashboard View All button
    document.getElementById('btnViewAllTransactions')?.addEventListener('click', () => switchView('transactions'));

    // Dashboard Alert Banner button
    document.getElementById('btnAlertAdjustBudget')?.addEventListener('click', () => switchView('budgets'));

    // Transaction Modal Type Switcher
    const labelExpense = document.getElementById('labelTypeExpense');
    const labelIncome = document.getElementById('labelTypeIncome');
    const formTxn = document.getElementById('formTransaction');
    const modalBadge = document.getElementById('modalTxnIconBadge');

    formTxn?.querySelectorAll('input[name="txnType"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'income') {
          labelIncome.classList.add('income-active');
          labelExpense.classList.remove('expense-active');
          if (modalBadge) modalBadge.className = 'modal-icon-badge';
          // auto suggest Salary or Freelance
          const catSelect = document.getElementById('txnCategory');
          if (catSelect && !['Salary', 'Freelance'].includes(catSelect.value)) {
            catSelect.value = 'Salary';
          }
        } else {
          labelExpense.classList.add('expense-active');
          labelIncome.classList.remove('income-active');
          if (modalBadge) modalBadge.className = 'modal-icon-badge modal-icon-danger';
          const catSelect = document.getElementById('txnCategory');
          if (catSelect && ['Salary', 'Freelance'].includes(catSelect.value)) {
            catSelect.value = 'Food';
          }
        }
        lucide.createIcons();
      });
    });

    // Close Modal Buttons
    document.getElementById('btnCloseTxnModal')?.addEventListener('click', closeTransactionModal);
    document.getElementById('btnCancelTxnModal')?.addEventListener('click', closeTransactionModal);

    // Form Submissions
    document.getElementById('formTransaction')?.addEventListener('submit', handleSaveTransaction);
    document.getElementById('formOverallBudget')?.addEventListener('submit', handleSaveOverallBudget);
    document.getElementById('formCategoryBudget')?.addEventListener('submit', handleSaveCategoryBudget);

    // Budgets view buttons
    document.getElementById('btnEditOverallBudget')?.addEventListener('click', openOverallBudgetModal);
    document.getElementById('btnCloseOverallBudgetModal')?.addEventListener('click', closeOverallBudgetModal);
    document.getElementById('btnCancelOverallBudgetModal')?.addEventListener('click', closeOverallBudgetModal);

    document.getElementById('btnAddCategoryBudget')?.addEventListener('click', () => openCategoryBudgetModal());
    document.getElementById('btnCloseCatBudgetModal')?.addEventListener('click', closeCategoryBudgetModal);
    document.getElementById('btnCancelCatBudgetModal')?.addEventListener('click', closeCategoryBudgetModal);

    // Confirm Modal Buttons
    document.getElementById('btnCloseConfirmModal')?.addEventListener('click', closeConfirmModal);
    document.getElementById('btnCancelConfirm')?.addEventListener('click', closeConfirmModal);
    document.getElementById('btnProceedConfirm')?.addEventListener('click', () => {
      if (confirmCallback) {
        confirmCallback();
      }
      closeConfirmModal();
    });

    // Search and Filters (Transactions View)
    const searchInput = document.getElementById('txnSearchInput');
    const clearSearchBtn = document.getElementById('txnClearSearch');

    searchInput?.addEventListener('input', (e) => {
      state.filter.search = e.target.value.trim();
      state.pagination.page = 1;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = state.filter.search ? 'flex' : 'none';
      }
      renderTransactionsView();
    });

    clearSearchBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.filter.search = '';
      clearSearchBtn.style.display = 'none';
      state.pagination.page = 1;
      renderTransactionsView();
    });

    document.getElementById('filterType')?.addEventListener('change', (e) => {
      state.filter.type = e.target.value;
      state.pagination.page = 1;
      renderTransactionsView();
    });

    document.getElementById('filterCategory')?.addEventListener('change', (e) => {
      state.filter.category = e.target.value;
      state.pagination.page = 1;
      renderTransactionsView();
    });

    document.getElementById('filterStartDate')?.addEventListener('change', (e) => {
      state.filter.startDate = e.target.value;
      state.pagination.page = 1;
      renderTransactionsView();
    });

    document.getElementById('filterEndDate')?.addEventListener('change', (e) => {
      state.filter.endDate = e.target.value;
      state.pagination.page = 1;
      renderTransactionsView();
    });

    document.getElementById('filterSort')?.addEventListener('change', (e) => {
      state.filter.sort = e.target.value;
      renderTransactionsView();
    });

    // Reset Filters
    const resetFiltersFn = () => {
      state.filter = {
        search: '',
        type: 'all',
        category: 'all',
        startDate: '',
        endDate: '',
        sort: 'date-desc'
      };
      state.pagination.page = 1;

      if (searchInput) searchInput.value = '';
      if (clearSearchBtn) clearSearchBtn.style.display = 'none';
      const fType = document.getElementById('filterType');
      const fCat = document.getElementById('filterCategory');
      const fStart = document.getElementById('filterStartDate');
      const fEnd = document.getElementById('filterEndDate');
      const fSort = document.getElementById('filterSort');

      if (fType) fType.value = 'all';
      if (fCat) fCat.value = 'all';
      if (fStart) fStart.value = '';
      if (fEnd) fEnd.value = '';
      if (fSort) fSort.value = 'date-desc';

      renderTransactionsView();
    };

    document.getElementById('btnResetFilters')?.addEventListener('click', resetFiltersFn);
    document.getElementById('btnEmptyResetFilters')?.addEventListener('click', resetFiltersFn);

    // Pagination controls
    document.getElementById('rowsPerPage')?.addEventListener('change', (e) => {
      state.pagination.rowsPerPage = parseInt(e.target.value, 10);
      state.pagination.page = 1;
      renderTransactionsView();
    });

    document.getElementById('btnPagePrev')?.addEventListener('click', () => {
      if (state.pagination.page > 1) {
        state.pagination.page--;
        renderTransactionsView();
      }
    });

    document.getElementById('btnPageNext')?.addEventListener('click', () => {
      state.pagination.page++;
      renderTransactionsView();
    });

    // Analytics Timeframe Selector
    document.getElementById('analyticsPeriod')?.addEventListener('change', (e) => {
      state.analyticsPeriod = e.target.value;
      renderAnalyticsView();
    });

    // Data Management Buttons
    document.getElementById('btnExportCsv')?.addEventListener('click', exportTransactionsCsv);
    document.getElementById('btnDataExportCsv')?.addEventListener('click', exportTransactionsCsv);
    document.getElementById('btnDataExportJson')?.addEventListener('click', exportCompleteJsonBackup);

    // Import file picker
    const fileInput = document.getElementById('importJsonFileInput');
    document.getElementById('btnTriggerImportFile')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImportJsonFile(e.target.files[0]);
        e.target.value = ''; // reset so same file can be selected again
      }
    });

    // Sample Data & Clear Data buttons
    document.getElementById('btnLoadSampleData')?.addEventListener('click', () => {
      showConfirmModal(
        'Load Sample Data',
        'This will populate realistic sample transactions and budgets formatted in Indian Rupees (₹). Existing data will be replaced. Proceed?',
        'Load Sample Data',
        false,
        () => loadSampleData(true)
      );
    });

    document.getElementById('btnClearAllData')?.addEventListener('click', () => {
      showConfirmModal(
        'Clear All Data',
        'This will permanently delete all stored transactions, budgets, and settings from this browser. This cannot be undone.',
        'Wipe Everything',
        true,
        () => clearAllData()
      );
    });

    // Close modals on backdrop click or ESC key
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.style.display = 'none';
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop').forEach(b => {
          b.style.display = 'none';
        });
      }
    });
  }

  // Current Date display in Header
  function initDateDisplay() {
    const el = document.getElementById('currentDateDisplay');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  }

  // --- App Initialization ---

  function initApp() {
    loadFromStorage();
    initDateDisplay();
    applyTheme(state.settings.theme || 'light');
    setupEventListeners();
    switchView('dashboard');
    lucide.createIcons();
  }

  // Expose global controller for inline HTML handlers
  window.SpendWise = {
    openTransactionModal,
    confirmDeleteTransaction,
    openCategoryBudgetModal,
    confirmDeleteCategoryBudget,
    showToast
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
