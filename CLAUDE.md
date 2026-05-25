# B2TW POS App - Memory

## Critical Rules

### Pricing Calculation Rule ⚠️ IMPORTANT
**The menu price displayed on the menu management page is the TOTAL PRICE INCLUDING GST.**

When calculating invoice items:
1. Menu price (from products.price) = total price with GST included
2. Calculate unit_price (pre-tax) = menu_price / 1.05
3. Calculate GST amount = menu_price - unit_price
4. Total in invoice = unit_price + GST = menu_price ✓

**Example:** If menu shows "ThumsUp 20"
- Menu price = ₹20 (total with GST)
- Unit price = 20 / 1.05 = ₹19.05
- GST (5%) = 20 - 19.05 = ₹0.95
- Invoice total = 19.05 + 0.95 = ₹20.00 ✓

**Apply everywhere:** invoice generation, reports, order_items table, dashboard metrics

---

## Project Context

**App:** B2TW POS (Point of Sale System for Bao to the Wings)
**Purpose:** Restaurant billing, inventory, and reporting
**Tech Stack:** React + TypeScript (frontend), Node.js/Express (backend), SQLite (database)

## Key Components

| Component | Purpose |
|-----------|---------|
| DashboardOverview | Sidebar dashboard showing today/month sales |
| ReportsView | Reports & Analytics with 11+ report types |
| OrderFlow | POS teller screen for creating orders |
| MenuManagement | Admin screen to manage products |

## Database Schema Notes

- **products** table: `price` field = total price (with GST)
- **orders** table: `total_amount` = grand total of all items
- **order_items** table: `unit_price`, `gst`, `total_price` (all calculated from product.price)

## Active Work Areas

- Reports tab showing ₹0 → Fixed by changing field names from `total_sales` to `total_price`
- "Dashboard" tab label → Changed to "Overview"
- Invoice generation → Uses correct pricing calculation

---

## Backfill Logic Constraints ⚠️ MANDATORY

### Customer ID Format (NO NULLS ALLOWED)
**Format:** `CUSTYYYYMMDDXXX`
- `YYYY` = year, `MM` = month, `DD` = day, `XXX` = sequential per day (001, 002...)
- Example: `CUST20260523001`, `CUST20260523002`
- **NEVER pass NULL for customer_id in orders table**
- Used in: `backfill-invoices-may.py` and any future data generation scripts

### Backfill Script Rules
- Always generate customer IDs in the required format
- Always calculate GST: `unit_price = menu_price / 1.05`
- Always create associated bills after orders
- Set order status to 'completed' for backfilled invoices
- See `BACKFILL_LOGIC.md` for complete documentation

### Dashboard & Reports Verification
After running backfill scripts:
1. Verify no NULL customer_ids: `SELECT COUNT(*) FROM orders WHERE customer_id IS NULL`
2. Check dashboard shows correct customer count for the date
3. Verify Sales Report displays correct totals and GST breakdown
