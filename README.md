# Makhana Inventory, Sales & Delivery Management System

A production-oriented, mobile-first web application designed for a makhana business to manage inventory, salesman field order-taking, delivery tracking, GST invoicing, and real-time business analytics.

---

## 1. System Architecture & Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React (Icons), Recharts (Analytics), Supabase JS Client (Realtime Subscriptions).
- **Backend**: Node.js with Express.js running in a serverless environment (`api/index.js`).
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) and stored atomic functions (`place_order_atomic`, `cancel_order_with_restock`, `adjust_stock_atomic`, `generate_invoice_atomic`).
- **Deployment**: Vercel monorepo configuration with serverless API route delegation.
- **Timezone**: Stored in UTC, formatted and displayed in `Asia/Kolkata` (IST).
- **Monetary Storage**: Exact integer paise (`1 INR = 100 paise`), preventing floating-point rounding errors.

---

## 2. Directory Structure

```text
Makhana/
├── api/                     # Serverless Express API
│   ├── middleware/          # Auth & Role verification (Admin vs Salesman)
│   ├── routes/              # Modular API endpoints (auth, orders, inventory, settings, invoices, analytics)
│   ├── utils/               # Supabase admin client & integer paise GST calculator
│   ├── index.js             # Express app entry point
│   ├── package.json
│   └── .env.example
├── frontend/                # React + Vite mobile-first web app
│   ├── src/
│   │   ├── components/      # Badges, Navbar, BottomNav, Modal, Toast, InvoicePrint
│   │   ├── context/         # AuthContext & CartContext (persistent draft cart)
│   │   ├── lib/             # Supabase client, API fetcher, currency/date formatters
│   │   ├── pages/           # Login, Unauthorized
│   │   │   ├── admin/       # Dashboard, Orders, Inventory, Salesmen, Analytics, Settings
│   │   │   └── salesman/    # Home, Catalogue, Cart, Orders, Deliveries, Performance
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── supabase/
│   ├── migrations/
│   │   ├── 20260101000000_init_schema.sql       # Tables, constraints, realtime publications
│   │   ├── 20260101000001_atomic_order_rpc.sql  # Atomic transactions, row locks, GST snapshotting
│   │   └── 20260101000002_rls_policies.sql      # Row Level Security policies
│   └── seed.sql                                 # 12 initial catalogue products & business settings template
├── tests/
│   ├── gst.test.js          # Unit tests for intra/inter-state inclusive/exclusive GST
│   └── order_logic.test.js  # State machine, failure reason & restock idempotency tests
├── scripts/
│   └── create_first_admin.js # CLI utility to securely provision the initial admin account
├── vercel.json              # Vercel deployment & routing configuration
├── package.json             # Root workspace runner scripts
└── .env.example             # Top-level environment template
```

---

## 3. Database Setup & Migrations (Supabase)

### Step 3.1: Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL**, **Anon Key**, and **Service Role Key** under **Project Settings -> API**.

### Step 3.2: Run Database Migrations
In the Supabase Dashboard, navigate to the **SQL Editor** and execute the migration files in numerical order:
1. Copy and run `supabase/migrations/20260101000000_init_schema.sql`
2. Copy and run `supabase/migrations/20260101000001_atomic_order_rpc.sql`
3. Copy and run `supabase/migrations/20260101000002_rls_policies.sql`

### Step 3.3: Seed Initial Catalogue & Settings
Run `supabase/seed.sql` in the SQL Editor. This inserts:
- The 12 initial makhana products with their exact configured unit prices and initial stock `0`.
- The default business settings row (`id = 1`) with placeholder GSTIN.

---

## 4. Secure Creation of the First Admin Account

To adhere to security best practices, there is **no public registration**. The initial administrator is provisioned using the server-side CLI tool:

```bash
# 1. Ensure .env or api/.env contains SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
# 2. Run the provisioning script:
node scripts/create_first_admin.js <admin_email> <password> "<Full Name>" "<Mobile Number>"

# Example:
node scripts/create_first_admin.js admin@makhanabiz.com AdminPassword123! "Rajesh Kumar" "+91 98765 43210"
```

Once executed, log in at `/` using these credentials.

---

## 5. Initial Stock Entry & Product Management

Per client rules, starting stock is `0` until entered by the admin.
1. Log in as **Admin**.
2. Go to the **Inventory** tab.
3. For each product, tap **Adjust Stock**.
4. Select **Add Stock**, input the verified physical quantity (e.g. `100`), enter a reason (e.g. *Initial warehouse stock count*), and tap **Save Adjustment**.
5. Once stock is positive, salesmen can immediately view and order the product.

---

## 6. Business & GST Invoicing Configuration

Before issuing legal GST invoices:
1. Log in as **Admin** and navigate to the **Settings** tab.
2. Configure:
   - **Legal Business Name** (e.g., `MAKHANA TRADERS & PROCESSORS PVT LTD`)
   - **Business Address**
   - **GSTIN** (Valid 15-digit state GSTIN)
   - **Supplier State** & **State Code** (e.g., `Bihar` / `10`)
   - **Invoice Prefix** (e.g., `MKH`)
   - **Pricing Model**: Check whether catalogue prices are GST-inclusive or GST-exclusive.
   - **Bank Account Details** (Printed on invoices)
3. Tap **Save All Settings**. The system prevents official invoice generation if the business GSTIN is missing.

---

## 7. Salesman Account Provisioning

Salesman accounts are created exclusively by the Admin:
1. Go to the **Salesmen** tab in the Admin panel.
2. Tap **New Salesman**.
3. Fill in Full Name, Email, Password, and Phone.
4. The account is created through the secure `/api/auth/create-salesman` endpoint using Supabase Admin Auth without exposing service-role keys to the browser.
5. Provide credentials to the salesman.
6. The admin can deactivate any salesman account at any time with a single tap.

---

## 8. Business Workflows & Execution

### Day 1: Order Placement (Salesman on Android Phone)
1. Salesman logs in and selects **New Order**.
2. Searches or browses available makhana products. Out-of-stock items cannot be ordered.
3. Uses `+` and `-` buttons to set quantities.
4. Persistent cart bar shows live item count and total.
5. Tap **View Cart**, enters customer shop name, phone number, and delivery address.
6. Reviews subtotal, GST, and final bill amount.
7. Taps **Confirm & Place Order**.
8. The database transaction locks product rows, verifies stock, deducts stock atomically, logs the stock movement audit, records the order, and outputs a unique order number (`MKH-YYYYMMDD-XXXX`).
9. Realtime listeners update the Admin dashboard and inventory immediately.

### Day 2: Delivery Execution (Salesman)
1. Salesman opens the **Deliveries** tab.
2. Taps **Out For Delivery** when dispatching.
3. When customer receives goods and pays cash:
   - Taps **Delivered** (records exact delivery timestamp and completing salesman).
4. If customer is unavailable or refuses:
   - Taps **Report Delivery Failed** and selects a mandatory reason.
   - **Stock is NOT deducted again** and is NOT returned automatically.
5. If an order must be cancelled:
   - Only the Admin can authorize cancellation from the Admin Orders tab.
   - Admin enters mandatory cancellation reason and chooses whether to restore stock. Stock restoration happens atomically and exactly once.

---

## 9. Vercel Deployment Guide

### Step 9.1: Connect Repository to Vercel
1. Push this repository to GitHub or GitLab.
2. In Vercel, click **Add New -> Project** and import the repository.
3. Framework Preset: **Other** (configured via `vercel.json`).

### Step 9.2: Configure Environment Variables in Vercel
Under **Project Settings -> Environment Variables**, add:

| Variable Name | Description | Environment |
|---|---|---|
| `SUPABASE_URL` | Your Supabase Project URL (`https://xyz.supabase.co`) | Production, Preview |
| `SUPABASE_ANON_KEY` | Public Supabase Anon API key | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Private Supabase Service Role Key (Backend only) | Production, Preview |
| `VITE_SUPABASE_URL` | Your Supabase Project URL (Vite bundle) | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase Anon API key (Vite bundle) | Production, Preview |
| `VITE_API_URL` | `/api` | Production, Preview |

### Step 9.3: Deploy
Click **Deploy**. Vercel will:
- Build the React frontend into `dist/` using Vite.
- Package the Express backend in `api/index.js` as serverless functions.
- Route all `/api/*` traffic to the backend and all client routes to the single page app.

---

## 10. Verification & Test Suite

Run the automated test suites locally:
```bash
# Run all unit tests
npm test

# Output:
# --- RUNNING GST CALCULATION TESTS ---
# ✓ Test Case 1 Passed: Intra-state GST-inclusive calculation
# ✓ Test Case 2 Passed: Inter-state GST-inclusive calculation
# ✓ Test Case 3 Passed: Intra-state GST-exclusive calculation
# ✓ Test Case 4 Passed: Order Totals Aggregation
# ALL GST CALCULATION TESTS PASSED SUCCESSFULLY! 🎉
# --- RUNNING ORDER LIFECYCLE & STATE MACHINE TESTS ---
# ✓ Test: Status state machine validation passed
# ✓ Test: Delivery failed reason requirement passed
# ✓ Test: Atomic stock restoration idempotency guard passed
# ALL ORDER LIFECYCLE TESTS PASSED! 🎉
```
