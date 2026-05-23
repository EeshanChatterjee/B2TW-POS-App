# B2TW POS Pricing Rules & Specifications

## Overview
This document defines the pricing model and calculation rules for the B2TW POS system.

## Core Principle
**All menu prices are stored as TOTAL PRICE (inclusive of 5% GST).**

This means:
- The price shown in the menu management page = total price paid by customer
- Base price (pre-tax) and GST amount are DERIVED from this total, not stored

## GST Details
- **GST Rate:** 5% (fixed)
- **Applied on:** Base price (unit price)
- **Stored format:** Total price = Base price + GST

## Calculation Formulas

### Given: Total Price (Menu Price)
When you have the menu price (total with GST):

```
base_price = total_price / 1.05
gst_amount = total_price - base_price
// Verification: base_price + gst_amount = total_price ✓
```

### Example: Menu shows ₹100
```
total_price = 100
base_price = 100 / 1.05 = 95.24
gst_amount = 100 - 95.24 = 4.76
Verification: 95.24 + 4.76 = 100.00 ✓
```

### Example: Menu shows ₹20
```
total_price = 20
base_price = 20 / 1.05 = 19.05
gst_amount = 20 - 19.05 = 0.95
Verification: 19.05 + 0.95 = 20.00 ✓
```

## Where This Applies

### 1. Database Schema
- **products table** → `price` field = total price (with GST)
- **order_items table** → `total_price` = total per item, `unit_price` = base, `gst` = GST amount
- **orders table** → `total_amount` = sum of all order_items.total_price

### 2. Invoice Generation
When creating an invoice:
1. Fetch product.price (which is total with GST)
2. Calculate: `unit_price = price / 1.05`
3. Calculate: `gst = price - unit_price`
4. Store in order_items: unit_price, gst, total_price
5. Invoice displays: Base | GST | Total columns

### 3. Backend Reports (priceCalculations.js)
```javascript
// utility functions for price breakdown
calculateBasePrice(totalPrice) → totalPrice / 1.05
calculateGSTAmount(totalPrice) → totalPrice - basePrice
getPriceBreakdown(totalPrice) → { base_price, gst_amount, total_price }
```

### 4. Dashboard Metrics
When displaying metrics (today's sales, monthly sales, etc.):
- Use `total_price` from orders or order_items
- If breaking down: apply price calculation formulas
- Display: Base amount | GST collected | Total sales

### 5. Frontend Components
- **DashboardOverview.tsx** → Uses api.getDashboardMetrics()
  - Displays: `metrics.today.total_price` (not total_sales)
  - Price breakdowns use the formulas above
  
- **ReportsView.tsx** → Uses api.getDashboardMetrics() for dashboard section
  - Displays: `reportData.data.today.total_price` (not total_sales)
  - All price references use `total_price` field

## Implementation Checklist

- [x] Backend utility functions (`priceCalculations.js`) - Correct formulas
- [x] Database schema - products.price = total price
- [x] Invoice generation script - Correct calculation
- [x] Dashboard metrics endpoint - Returns total_price
- [x] Frontend field names - Use total_price (not total_sales)
- [x] Memory documentation - Rules saved in CLAUDE.md

## Testing

To verify pricing is correct:
1. Check menu shows ₹20 for ThumsUp
2. Generate invoice → should show: Base ₹19.05, GST ₹0.95, Total ₹20.00
3. Dashboard metric → should show ₹20 as sales value
4. Database order_items.total_price → should be ₹20.00

## Common Mistakes to Avoid

❌ **Wrong:** Treating menu_price as base price and calculating GST on top
- This would give: 20 + (20 * 0.05) = 21.00 ❌

✓ **Correct:** Menu_price is already the total, derive base from it
- This gives: 20 / 1.05 = 19.05 base, 0.95 GST, 20.00 total ✓

❌ **Wrong:** Storing base_price and gst separately in products table
- Causes data inconsistency across system

✓ **Correct:** Store only total_price in products, calculate base/gst when needed
- Single source of truth, consistent everywhere

## Questions?

If uncertain about pricing calculations:
1. Check this document first
2. Check priceCalculations.js for correct formulas
3. Use the utility functions (calculateBasePrice, getPriceBreakdown)
4. Never hardcode price calculations in components/endpoints
