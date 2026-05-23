# Transaction Price Fix & Validation

## Overview

This documentation covers the scripts and process for ensuring transaction prices (order items, orders, and bills) are always consistent with menu prices.

## Problem Statement

There are several scenarios where transaction prices can become inconsistent:

1. **Menu Price Changes**: If a product price changes after an order is placed, the order_items still have the old price
2. **Price Calculation Errors**: If prices were calculated incorrectly during order creation
3. **Data Entry Errors**: Manual database modifications that weren't validated
4. **System Upgrades**: Transitions between pricing models (e.g., from separate base+GST to total_price-only)

## Current Data Model

### order_items Table
```
id (PK)
order_id (FK)
product_id (FK) → points to current menu price
quantity
unit_price (the ACTUAL price charged at time of order - may differ from current menu)
total_price = quantity × unit_price
```

### orders Table
```
id (PK)
customer_id (FK)
total_amount = SUM of all order_items.total_price
...
```

### bills Table
```
id (PK)
order_id (FK)
total_amount (should match corresponding order.total_amount)
...
```

## Scripts

### 1. validate-transaction-prices.js
**Purpose**: Analyze and report on price discrepancies WITHOUT making changes

**What it checks**:
- ✓ Order items where stored unit_price ≠ current menu price
- ✓ Orders where total_amount ≠ SUM of order_items.total_price
- ✓ Bills where total_amount ≠ their corresponding order.total_amount

**Output**: Detailed report with examples of discrepancies

**Usage**:
```bash
cd backend
node src/db/migrations/validate-transaction-prices.js
```

**Example Output**:
```
🔍 Validating Transaction Prices...

📋 Total Orders: 127

⚠️  ORDER ITEMS: Found 12 items with incorrect prices
   Order: abc123
   Product: Bao (Qty: 2)
   Stored: ₹150, Menu: ₹160
   ...

⚠️  ORDERS: Found 8 orders with incorrect totals
   Order: xyz789
   Stored: ₹450.50, Correct: ₹480.00
   Difference: +₹29.50
   ...

📊 SUMMARY:
   Total Orders Checked: 127
   Order Items with Wrong Prices: 12
   Orders with Wrong Totals: 8
   Bills with Wrong Amounts: 5
```

### 2. fix-transaction-prices.js
**Purpose**: Fix all identified price discrepancies and sync with menu prices

**What it does**:
1. Loads all orders and their items
2. For each order_item:
   - Updates unit_price to current menu price
   - Recalculates total_price = quantity × unit_price
3. For each order:
   - Recalculates total_amount = SUM of order_items.total_price
4. For each bill:
   - Updates total_amount to match its corresponding order
5. Verifies all changes and reports summary

**Important**: This script modifies data. Always run validation first!

**Usage**:
```bash
cd backend
# First, validate to see what will be changed
node src/db/migrations/validate-transaction-prices.js

# Then, apply fixes
node src/db/migrations/fix-transaction-prices.js
```

**Example Output**:
```
🔧 Starting transaction price fix...

📋 Fetching all orders and items...
   Found 127 orders

   ✓ Fixed item abc123: ₹150 → ₹160
   ✓ Fixed order xyz789: ₹450.50 → ₹480.00
   ✓ Fixed bill bill456: ₹450.50 → ₹480.00
   ...

✅ Migration Complete!

📊 Summary:
   • Order Items Fixed: 12
   • Orders Fixed: 8
   • Bills Fixed: 5
   • Total Orders Checked: 127

🔍 Verification...
   ✓ No discrepancies found - all prices are consistent!

✨ All transaction prices are now synced with menu prices!
```

## Workflow

### When to Run

1. **After Menu Price Changes** (if implementing price history):
   - Prices stored in order_items represent historical prices at time of order
   - Current validation is always against current menu prices
   - This is actually correct behavior - old orders should keep their historical prices

2. **After System Upgrades**:
   - When migrating from one pricing model to another
   - When fixing data integrity issues

3. **Periodically** (monthly/quarterly):
   - As a health check to ensure data consistency

### Step-by-Step Process

```bash
# Step 1: Validate current state
node src/db/migrations/validate-transaction-prices.js

# Step 2: Review the discrepancies
# Look at the output to understand the scope

# Step 3: Back up the database
cp db/pos.sqlite db/pos.sqlite.backup

# Step 4: Apply fixes
node src/db/migrations/fix-transaction-prices.js

# Step 5: Verify fixes
node src/db/migrations/validate-transaction-prices.js

# Should now show: "All transaction prices are consistent and correct!"
```

## Important Considerations

### Historical Accuracy
⚠️ **Note on Price History**: 
- The current schema stores unit_price in order_items, which is the price charged at time of order
- This is the **correct behavior** for historical accuracy
- Old orders should reflect the prices customers actually paid, not current menu prices
- If you want to track price history, implement a `product_price_history` table instead

### When NOT to Fix
You should NOT run fix-transaction-prices.js if:
- You need to preserve historical prices (customers paid the old price for old orders)
- The "discrepancy" is actually correct (old orders with old prices)

### Data Integrity Checks in Code

The backend API already prevents issues when creating new orders:

```javascript
// orders.js: All prices use cents-based rounding
const itemTotal = roundToCents(item.quantity * item.price);
const roundedTotal = sumTotalPrices([total_amount]);

// Ensures floating-point precision doesn't cause discrepancies
```

## Troubleshooting

### Script fails to connect to database
```bash
# Check that database exists
ls -la backend/db/pos.sqlite

# Check file permissions
chmod 644 backend/db/pos.sqlite
```

### Script runs but reports incorrect "discrepancies"
- This might indicate a real issue with the data model
- Check if `sumTotalPrices()` rounding is working correctly
- Review the priceCalculations.js utility functions

### Too many discrepancies to fix automatically
- If there are hundreds of discrepancies, investigate the root cause first
- There may be a bug in how prices were calculated historically
- Consider doing a selective fix for specific date ranges

## Files Modified During Fix

1. `order_items.unit_price` - Updated to match menu prices
2. `order_items.total_price` - Recalculated as quantity × unit_price
3. `orders.total_amount` - Recalculated from sum of order_items
4. `orders.updated_at` - Set to current timestamp
5. `bills.total_amount` - Updated to match order total_amount
6. `bills.updated_at` - Set to current timestamp

All other fields remain unchanged.

## Related Files

- `/backend/src/utils/priceCalculations.js` - Price calculation utilities
- `/backend/src/api/orders.js` - Order creation API (uses correct rounding)
- `/backend/src/api/reports.js` - Reports API (uses on-the-fly calculations)
- `/backend/src/db/schema.sql` - Database schema

## Support

For issues or questions about these scripts:
1. Check that you're running them from the correct directory
2. Ensure the database path is correct in connection.js
3. Review the validation output to understand the discrepancies
4. Back up your database before running the fix script
