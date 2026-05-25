# Backfill Logic Documentation

## Overview
The backfill scripts generate synthetic invoice and sales data for testing, reporting, and dashboard development. They follow strict business rules to ensure data consistency.

## Critical Rules

### 1. Customer ID Format ⚠️ MANDATORY
**Customer IDs CANNOT be NULL. Format: `CUSTYYYYMMDDXXX`**

- `CUST` = literal prefix
- `YYYY` = 4-digit year (e.g., 2026)
- `MM` = 2-digit month (e.g., 05)
- `DD` = 2-digit day (e.g., 23)
- `XXX` = 3-digit sequential counter per day (001, 002, 003, etc.)

**Examples:**
```
CUST20260501001  # First invoice on May 1, 2026
CUST20260501002  # Second invoice on May 1, 2026
CUST20260523001  # First invoice on May 23, 2026
```

**Why:** The POS system uses customer IDs to track repeat customers and sales trends. NULL values break reporting and analytics.

### 2. Pricing Calculation (GST-Inclusive) ⚠️ CRITICAL

**All prices are stored as TOTAL PRICE (GST-inclusive). GST Rate: 5%**

When backfilling with product prices:
```python
# Menu price (from products.price) = total price WITH GST
menu_price = 20.00  # This is the final price shown on menu

# Calculate base price (pre-tax)
unit_price = menu_price / 1.05  # 20.00 / 1.05 = 19.05

# Calculate GST amount
gst = menu_price - unit_price  # 20.00 - 19.05 = 0.95

# Verify: unit_price + gst = menu_price
# 19.05 + 0.95 = 20.00 ✓
```

**Apply this to every order_item entry:**
```python
unit_price = menu_price / 1.05
gst = menu_price - unit_price
total_price = menu_price * quantity
```

### 3. Order Status
All backfilled orders must have:
- `status = 'completed'` — invoices are finalized
- `customer_id` — populated with proper format
- `created_at` and `updated_at` — matching invoice timestamp

## Script: `backfill-invoices-may.py`

### Purpose
Generates 3-15 random invoices per day for May 1-22, 2026 with realistic sales patterns.

### Data Generated Per Run
- Random invoice count per day (3-15)
- Random order timestamps (8am - 10pm)
- Random product selection (1-3 items per invoice)
- Random quantities (1-3 per item)
- Automatic customer ID generation in CUSTYYYYMMDDXXX format
- Proper GST calculations
- Associated bills with auto-generated bill numbers

### How It Works

**1. Customer ID Generation (Line 57)**
```python
customer_id = f"CUST{day_date_format}{str(invoice_num + 1).zfill(3)}"
# Example: CUST20260501001 for the 1st invoice on May 1, 2026
```

**2. Pricing Calculation (Lines 68-70)**
```python
unit_price = menu_price / 1.05      # Pre-tax price
gst = menu_price - unit_price        # GST amount
total_price = menu_price * quantity  # Total per quantity
```

**3. Order Creation (Lines 84-87)**
```python
# Orders table: Must include customer_id (NOT NULL)
cursor.execute('''
    INSERT INTO orders (id, customer_id, total_amount, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
''', (order_id, customer_id, order_total, 'completed', created_at, created_at))
```

**4. Bill Creation (Lines 123-136)**
```python
# Auto-generates bill numbers: B000001, B000002, etc.
bill_number = f"B{str(cursor.fetchone()[0] + 1).zfill(6)}"
# Creates bill with status='paid' for completed orders
```

### Running the Script

```bash
cd backend
python3 backfill-invoices-may.py
```

**Expected Output:**
```
===========================================================================
BACKFILLING INVOICES FOR MAY 1-22, 2026
===========================================================================

✓ 2026-05-01: 6 invoices created → ₹3095.00
✓ 2026-05-02: 15 invoices created → ₹9700.00
...
✓ Created 175 total invoice(s)
✓ Total Amount: ₹94425.00
✓ Period: May 1 - May 22, 2026

Now creating bills for all orders...
✓ Created 175 bill(s)
```

### Pre-Run Checklist
- [ ] Database exists at `./data/pos.db`
- [ ] `products` table is populated with active items
- [ ] Previous backfill data has been cleaned (optional)
- [ ] Date range in script matches intended period (lines 28-29)

## Maintenance Guidelines

### When Adding Features
1. **Keep customer ID format STRICT** — no deviations
2. **Always validate pricing calculations** — test against `priceCalculations.js`
3. **Ensure bills are created** — invoices without bills break reporting
4. **Test with dashboard** — verify metrics appear correctly

### Common Issues

**Issue:** Script fails with "No active products available"
- **Fix:** Ensure products table exists and has `is_active = 1` entries

**Issue:** Customer count shows 0 in dashboard
- **Fix:** Verify customer_id field is populated (no NULLs) using:
  ```python
  SELECT COUNT(*) FROM orders WHERE customer_id IS NULL
  ```

**Issue:** Sales report shows incorrect GST amounts
- **Fix:** Verify GST calculation uses `/ 1.05` not `* 0.05`

**Issue:** Duplicate customer IDs across days
- **Fix:** Check that `day_date_format` is changing daily and counter resets per day

## Related Files

- `priceCalculations.js` — Contains GST calculation utilities
- `reports.js` — Backend API that uses this data
- `ReportsView.tsx` — Frontend that displays reports
- `CLAUDE.md` — Project memory with pricing rules

## Version History

- **v1.0** (May 23, 2026) — Initial script with customer ID format enforcement and proper GST calculations
- Previous versions had NULL customer_ids — DEPRECATED
