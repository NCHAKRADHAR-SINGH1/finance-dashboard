# Finance Dashboard UI

Submission for Zorvyn - Frontend Developer Intern assignment.

This project is intentionally frontend-only and built with realistic product assumptions using mock data.

## Stack

- React + Vite
- Plain CSS (no UI kit)
- React hooks for state management
- localStorage for persistence

## Quick Demo Flow (for reviewer)

1. Open app and check summary cards + charts on load.
2. Use Role switch:
	- Viewer => read-only
	- Admin => add/edit/delete allowed
3. In Transactions, try search, filter, sort, date/amount range filters.
4. Click `Load mock API data` to simulate external data fetch.
5. Use `Export CSV` and `Export JSON`.
6. Toggle Dark mode to verify UI adaptability.

## Requirement Mapping

### 1) Dashboard Overview

Implemented:
- Summary cards: Total Balance, Total Income, Total Expenses
- Time-based chart: monthly balance trend
- Categorical chart: spending breakdown by category

### 2) Transactions Section

Implemented:
- Transaction list with Date, Description, Category, Type, Amount
- Search by keyword (description/category/type)
- Filters (type + category + date range + amount range)
- Sorting (date asc/desc, amount asc/desc)
- Empty state when no results match filters
- Optional grouping (by category/type)

### 3) Basic Role-Based UI

Implemented:
- Role selector: Viewer / Admin
- Viewer: read-only mode
- Admin: add, edit, and delete transactions

### 4) Insights Section

Implemented:
- Highest spending category
- Monthly expense comparison vs previous month
- Practical observation based on current balance

### 5) State Management

Managed states:
- transactions data
- filters/search/sort
- date range, amount range, grouping
- selected role
- selected theme (light/dark)
- add/edit modal + form draft state

Implementation uses `useState`, `useMemo`, and `useEffect` with clear derivations for totals/charts/insights.

### 6) UI / UX Expectations

Implemented:
- Clean and readable layout
- Responsive design for tablet/mobile breakpoints
- Empty/no-data handling for charts and table
- Clear action hierarchy and form validation for transaction save

## Additional Touches

- localStorage persistence (role + transactions)
- "Clear filters" quick action
- "Reset demo data" action for easy reviewer testing
- Dark mode toggle
- Mock API simulation (async load)
- CSV/JSON export
- Small motion + polished card/typography treatment

## Run Locally

1. `npm install`
2. `npm run dev`
3. Open the localhost URL printed in terminal

## Available Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run preview` - preview production build locally

## Build Check

- `npm run build` passes successfully.

## Scope Notes

- No backend is used (as per assignment guidance).
- Data is mock/demo data, persisted in browser storage.
- Full RBAC is intentionally not implemented; role behavior is UI-simulated per assignment requirement.
