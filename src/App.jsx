import React, { useEffect, useMemo, useState } from "react";

const SEED_TRANSACTIONS = [
  { id: "t1", date: "2026-03-01", description: "Salary - March", amount: 92000, category: "Salary", type: "income" },
  { id: "t2", date: "2026-03-03", description: "Rent", amount: 22000, category: "Housing", type: "expense" },
  { id: "t3", date: "2026-03-05", description: "Swiggy + groceries", amount: 3450, category: "Food", type: "expense" },
  { id: "t4", date: "2026-03-08", description: "Internet bill", amount: 999, category: "Utilities", type: "expense" },
  { id: "t5", date: "2026-03-11", description: "Freelance payout", amount: 12000, category: "Freelance", type: "income" },
  { id: "t6", date: "2026-03-13", description: "Uber", amount: 740, category: "Transport", type: "expense" },
  { id: "t7", date: "2026-03-17", description: "Movie", amount: 650, category: "Entertainment", type: "expense" },
  { id: "t8", date: "2026-03-19", description: "Mutual fund SIP", amount: 5000, category: "Investment", type: "expense" },
  { id: "t9", date: "2026-02-12", description: "Salary - Feb", amount: 91000, category: "Salary", type: "income" },
  { id: "t10", date: "2026-02-14", description: "Medical", amount: 1800, category: "Health", type: "expense" }
];

const MOCK_API_TRANSACTIONS = [
  { id: "m1", date: "2026-04-01", description: "Salary - April", amount: 94000, category: "Salary", type: "income" },
  { id: "m2", date: "2026-04-02", description: "Electricity bill", amount: 1650, category: "Utilities", type: "expense" },
  { id: "m3", date: "2026-04-03", description: "Flight ticket", amount: 8200, category: "Transport", type: "expense" },
  { id: "m4", date: "2026-04-04", description: "Client project", amount: 15000, category: "Freelance", type: "income" },
  { id: "m5", date: "2026-04-05", description: "Dining out", amount: 2100, category: "Food", type: "expense" }
];

const EXPENSE_CATEGORIES = ["Housing", "Food", "Utilities", "Transport", "Entertainment", "Investment", "Health", "Other"];

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function safeGetStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures (private mode / blocked storage)
  }
}

function normalizeTransaction(t, idx) {
  if (!t || typeof t !== "object") return null;
  const amount = Number(t.amount);
  const type = t.type === "income" ? "income" : "expense";
  const fallbackCategory = type === "income" ? "Other" : "Food";

  return {
    id: String(t.id ?? `txn-${idx}-${Date.now()}`),
    date: typeof t.date === "string" && t.date ? t.date : new Date().toISOString().slice(0, 10),
    description: String(t.description ?? "Untitled transaction"),
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    category: String(t.category ?? fallbackCategory),
    type
  };
}

function loadTransactions() {
  const raw = safeGetStorage("fd-transactions");
  if (!raw) return SEED_TRANSACTIONS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEED_TRANSACTIONS;
    const cleaned = parsed
      .map((t, idx) => normalizeTransaction(t, idx))
      .filter(Boolean)
      .filter((t) => t.amount > 0);
    return cleaned.length ? cleaned : SEED_TRANSACTIONS;
  } catch {
    return SEED_TRANSACTIONS;
  }
}

function monthKey(dateString) {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchMockApiTransactions() {
  await new Promise((resolve) => setTimeout(resolve, 650));
  return MOCK_API_TRANSACTIONS;
}

function downloadTextFile(fileName, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

function escapeCsvCell(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
    return `"${str.replaceAll("\"", "\"\"")}"`;
  }
  return str;
}

function App() {
  const lastUpdatedLabel = useMemo(
    () => new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    []
  );

  const [role, setRole] = useState(safeGetStorage("fd-role") || "viewer");
  const [theme, setTheme] = useState(safeGetStorage("fd-theme") || "light");
  const [transactions, setTransactions] = useState(loadTransactions);
  const [loadingMock, setLoadingMock] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [groupBy, setGroupBy] = useState("none");
  const [manualError, setManualError] = useState("");
  const [manualDraft, setManualDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    amount: "",
    category: "Food",
    type: "expense"
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    date: "",
    description: "",
    amount: "",
    category: "Food",
    type: "expense"
  });

  useEffect(() => {
    safeSetStorage("fd-transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    safeSetStorage("fd-role", role);
  }, [role]);

  useEffect(() => {
    safeSetStorage("fd-theme", theme);
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minAmount ? Number(minAmount) : null;
    const max = maxAmount ? Number(maxAmount) : null;
    let list = transactions.filter((t) => {
      const hitSearch = !q || [t.description, t.category, t.type].join(" ").toLowerCase().includes(q);
      const hitType = typeFilter === "all" || t.type === typeFilter;
      const hitCategory = categoryFilter === "all" || t.category === categoryFilter;
      const hitFromDate = !fromDate || t.date >= fromDate;
      const hitToDate = !toDate || t.date <= toDate;
      const hitMin = min === null || t.amount >= min;
      const hitMax = max === null || t.amount <= max;
      return hitSearch && hitType && hitCategory && hitFromDate && hitToDate && hitMin && hitMax;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.date) - new Date(a.date);
      if (sortBy === "date-asc") return new Date(a.date) - new Date(b.date);
      if (sortBy === "amount-desc") return b.amount - a.amount;
      if (sortBy === "amount-asc") return a.amount - b.amount;
      return 0;
    });

    return list;
  }, [transactions, search, typeFilter, categoryFilter, sortBy, fromDate, toDate, minAmount, maxAmount]);

  const groupedSummary = useMemo(() => {
    if (groupBy === "none") return [];
    const map = new Map();
    for (const t of filteredTransactions) {
      const key = groupBy === "category" ? t.category : t.type;
      if (!map.has(key)) map.set(key, { key, count: 0, total: 0 });
      const row = map.get(key);
      row.count += 1;
      row.total += Number(t.amount);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filteredTransactions, groupBy]);

  const totals = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return {
      income,
      expenses,
      balance: income - expenses
    };
  }, [transactions]);

  const trend = useMemo(() => {
    const grouped = new Map();
    for (const t of transactions) {
      const key = monthKey(t.date);
      if (!grouped.has(key)) grouped.set(key, { income: 0, expenses: 0 });
      const bucket = grouped.get(key);
      if (t.type === "income") bucket.income += Number(t.amount);
      else bucket.expenses += Number(t.amount);
    }

    return [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({ month, balance: v.income - v.expenses }));
  }, [transactions]);

  const spendingByCategory = useMemo(() => {
    const grouped = new Map();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      grouped.set(t.category, (grouped.get(t.category) || 0) + Number(t.amount));
    }
    return [...grouped.entries()]
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const insights = useMemo(() => {
    const highest = spendingByCategory[0];

    const monthMap = new Map();
    for (const t of transactions) {
      const key = monthKey(t.date);
      if (!monthMap.has(key)) monthMap.set(key, { income: 0, expenses: 0 });
      const row = monthMap.get(key);
      if (t.type === "income") row.income += Number(t.amount);
      else row.expenses += Number(t.amount);
    }

    const months = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const current = months[months.length - 1];
    const previous = months[months.length - 2];

    let comparison = "Need at least two months of data.";
    if (current && previous) {
      const diff = current[1].expenses - previous[1].expenses;
      const direction = diff > 0 ? "up" : "down";
      comparison = `Expenses are ${direction} by ${currency.format(Math.abs(diff))} vs previous month.`;
    }

    return {
      highestCategory: highest ? `${highest.category} (${currency.format(highest.value)})` : "No expense data yet",
      monthlyComparison: comparison,
      note:
        totals.balance >= 0
          ? "Your balance is positive. Keep tracking recurring expenses to improve savings."
          : "Your expenses are higher than income. Try reducing discretionary spending."
    };
  }, [spendingByCategory, transactions, totals.balance]);

  const maxTrend = Math.max(1, ...trend.map((t) => Math.abs(t.balance)));
  const maxCategory = Math.max(1, ...spendingByCategory.map((c) => c.value));

  function resetDraft() {
    setDraft({
      date: new Date().toISOString().slice(0, 10),
      description: "",
      amount: "",
      category: "Food",
      type: "expense"
    });
  }

  function startAdd() {
    setEditingId(null);
    resetDraft();
    setFormOpen(true);
  }

  function startEdit(txn) {
    setEditingId(txn.id);
    setDraft({
      date: txn.date,
      description: txn.description,
      amount: String(txn.amount),
      category: txn.category,
      type: txn.type
    });
    setFormOpen(true);
  }

  function saveTransaction(e) {
    e.preventDefault();
    if (role !== "admin") return;
    const amount = Number(draft.amount);
    if (!draft.date || !draft.description.trim() || !amount || amount <= 0) return;

    if (editingId) {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? { ...t, ...draft, amount: Number(draft.amount), description: draft.description.trim() }
            : t
        )
      );
    } else {
      setTransactions((prev) => [
        {
          id: `t${Date.now()}`,
          date: draft.date,
          description: draft.description.trim(),
          amount,
          category: draft.category,
          type: draft.type
        },
        ...prev
      ]);
    }

    setFormOpen(false);
    resetDraft();
  }

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setSortBy("date-desc");
    setFromDate("");
    setToDate("");
    setMinAmount("");
    setMaxAmount("");
    setGroupBy("none");
  }

  function resetDemoData() {
    setTransactions(SEED_TRANSACTIONS);
    clearFilters();
  }

  function deleteTransaction(id) {
    if (role !== "admin") return;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  async function loadMockApiData() {
    setLoadingMock(true);
    try {
      const data = await fetchMockApiTransactions();
      setTransactions((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const merged = [...prev];
        for (const item of data) {
          const normalized = normalizeTransaction(item, merged.length);
          if (normalized && !existingIds.has(normalized.id)) {
            merged.unshift(normalized);
            existingIds.add(normalized.id);
          }
        }
        return merged;
      });
    } finally {
      setLoadingMock(false);
    }
  }

  function exportAsJson() {
    const payload = JSON.stringify(filteredTransactions, null, 2);
    downloadTextFile("transactions-export.json", payload, "application/json");
  }

  function exportAsCsv() {
    const header = ["Date", "Description", "Category", "Type", "Amount"];
    const rows = filteredTransactions.map((t) => [t.date, t.description, t.category, t.type, t.amount]);
    const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
    downloadTextFile("transactions-export.csv", csv, "text/csv;charset=utf-8");
  }

  function addManualTransaction() {
    setManualError("");
    const amount = Number(manualDraft.amount);
    if (!manualDraft.date || !manualDraft.description.trim() || !amount || amount <= 0) {
      setManualError("Please fill date, description, and valid amount.");
      return;
    }

    setTransactions((prev) => [
      {
        id: `manual-${Date.now()}`,
        date: manualDraft.date,
        description: manualDraft.description.trim(),
        amount,
        category: manualDraft.category,
        type: manualDraft.type
      },
      ...prev
    ]);

    setManualDraft((p) => ({
      ...p,
      description: "",
      amount: ""
    }));
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>Finance Dashboard</h1>
          <p className="sub">Track balance, transactions and spending patterns · Updated {lastUpdatedLabel}</p>
        </div>

        <div className="header-controls">
          <label className="role-switch">
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <button className="ghost" onClick={() => setTheme((p) => (p === "light" ? "dark" : "light"))}>
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>

          <button className="ghost" onClick={loadMockApiData} disabled={loadingMock}>
            {loadingMock ? "Loading mock API..." : "Load mock API data"}
          </button>
        </div>
      </header>

      <section className="summary-grid">
        <article className="summary-card">
          <span>Total Balance</span>
          <strong>{currency.format(totals.balance)}</strong>
        </article>
        <article className="summary-card">
          <span>Total Income</span>
          <strong>{currency.format(totals.income)}</strong>
        </article>
        <article className="summary-card">
          <span>Total Expenses</span>
          <strong>{currency.format(totals.expenses)}</strong>
        </article>
      </section>

      <section className="charts-grid">
        <article className="panel">
          <h2>Balance Trend</h2>
          <p className="panel-sub">Monthly net balance (Income - Expenses)</p>
          <div className="bars">
            {trend.length === 0 && <p className="empty">No chart data yet.</p>}
            {trend.map((item) => (
              <div key={item.month} className="bar-row">
                <span>{item.month}</span>
                <div className="bar-track">
                  <div
                    className={`bar ${item.balance >= 0 ? "positive" : "negative"}`}
                    style={{ width: `${Math.max((Math.abs(item.balance) / maxTrend) * 100, 6)}%` }}
                  />
                </div>
                <strong>{currency.format(item.balance)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Spending Breakdown</h2>
          <p className="panel-sub">By category (expenses only)</p>
          <div className="bars">
            {spendingByCategory.length === 0 && <p className="empty">No expense data available.</p>}
            {spendingByCategory.map((item) => (
              <div key={item.category} className="bar-row">
                <span>{item.category}</span>
                <div className="bar-track">
                  <div className="bar expense" style={{ width: `${Math.max((item.value / maxCategory) * 100, 6)}%` }} />
                </div>
                <strong>{currency.format(item.value)}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Transactions</h2>
          <div className="section-actions">
            <button className="ghost" onClick={clearFilters}>Clear filters</button>
            {role === "admin" ? (
              <>
                <button className="ghost" onClick={resetDemoData}>Reset demo data</button>
                <button onClick={startAdd}>Add Transaction</button>
              </>
            ) : (
              <span className="note">Viewer mode: read only</span>
            )}
          </div>
        </div>

        <div className="mock-box">
          <p className="panel-sub">Add transaction manually (without JSON).</p>
          <div className="filters advanced-filters">
            <input
              type="date"
              value={manualDraft.date}
              onChange={(e) => setManualDraft((p) => ({ ...p, date: e.target.value }))}
            />
            <input
              value={manualDraft.description}
              placeholder="Description"
              onChange={(e) => setManualDraft((p) => ({ ...p, description: e.target.value }))}
            />
            <input
              type="number"
              min="1"
              placeholder="Amount"
              value={manualDraft.amount}
              onChange={(e) => setManualDraft((p) => ({ ...p, amount: e.target.value }))}
            />
            <select
              value={manualDraft.type}
              onChange={(e) =>
                setManualDraft((p) => ({
                  ...p,
                  type: e.target.value,
                  category: e.target.value === "income" ? "Salary" : "Food"
                }))
              }
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select
              value={manualDraft.category}
              onChange={(e) => setManualDraft((p) => ({ ...p, category: e.target.value }))}
            >
              {manualDraft.type === "income" ? (
                <>
                  <option value="Salary">Salary</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Other">Other</option>
                </>
              ) : (
                EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))
              )}
            </select>
            <div className="section-actions">
              <button className="ghost" onClick={loadMockApiData} disabled={loadingMock}>
                {loadingMock ? "Loading mock API..." : "Load mock API data"}
              </button>
              <button onClick={addManualTransaction}>Add manually</button>
            </div>
          </div>
          <div className="section-actions">
            <button className="ghost" onClick={resetDemoData}>Reset demo data</button>
          </div>
          {manualError && <p className="error-text">{manualError}</p>}
        </div>

        <div className="filters">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description/category" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {[...new Set(transactions.map((t) => t.category))].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Amount high to low</option>
            <option value="amount-asc">Amount low to high</option>
          </select>
        </div>

        <div className="filters advanced-filters">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <input type="number" min="0" placeholder="Min amount" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          <input type="number" min="0" placeholder="Max amount" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="none">No grouping</option>
            <option value="category">Group by category</option>
            <option value="type">Group by type</option>
          </select>
          <div className="section-actions">
            <button className="ghost" onClick={exportAsCsv}>Export CSV</button>
            <button className="ghost" onClick={exportAsJson}>Export JSON</button>
          </div>
        </div>

        {groupedSummary.length > 0 && (
          <div className="group-summary">
            {groupedSummary.map((g) => (
              <div key={g.key} className="group-chip">
                <strong>{g.key}</strong>
                <span>{g.count} txns · {currency.format(g.total)}</span>
              </div>
            ))}
          </div>
        )}

        {filteredTransactions.length === 0 ? (
          <div className="empty-box">No transactions match current filters.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{t.description}</td>
                    <td>{t.category}</td>
                    <td>
                      <span className={`pill ${t.type}`}>{t.type}</span>
                    </td>
                    <td className={t.type === "income" ? "amt-pos" : "amt-neg"}>
                      {t.type === "income" ? "+" : "-"}
                      {currency.format(t.amount)}
                    </td>
                    <td>
                      {role === "admin" && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button className="ghost" onClick={() => startEdit(t)}>Edit</button>
                          <button className="danger" onClick={() => deleteTransaction(t.id)}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel insights">
        <h2>Insights</h2>
        <ul>
          <li><strong>Highest spending category:</strong> {insights.highestCategory}</li>
          <li><strong>Monthly comparison:</strong> {insights.monthlyComparison}</li>
          <li><strong>Observation:</strong> {insights.note}</li>
        </ul>
      </section>

      {formOpen && (
        <div className="overlay" onClick={() => setFormOpen(false)}>
          <form className="modal" onSubmit={saveTransaction} onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit Transaction" : "Add Transaction"}</h3>

            <label>
              Date
              <input type="date" value={draft.date} onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))} required />
            </label>

            <label>
              Description
              <input
                value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Grocery shopping"
                required
              />
            </label>

            <div className="grid-2">
              <label>
                Amount
                <input
                  type="number"
                  min="1"
                  value={draft.amount}
                  onChange={(e) => setDraft((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
              </label>

              <label>
                Type
                <select value={draft.type} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </label>
            </div>

            <label>
              Category
              <select value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}>
                {draft.type === "income" ? (
                  <>
                    <option value="Salary">Salary</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Other">Other</option>
                  </>
                ) : (
                  EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))
                )}
              </select>
            </label>

            <div className="actions">
              <button type="button" className="ghost" onClick={() => setFormOpen(false)}>Cancel</button>
              <button type="submit">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
