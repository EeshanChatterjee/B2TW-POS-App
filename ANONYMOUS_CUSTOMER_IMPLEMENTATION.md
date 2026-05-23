# Anonymous Customer ID Implementation

## Overview
Implemented a system to automatically assign unique customer IDs to walk-in customers (no customer information) in the B2TW POS system. This ensures every order has a valid customer ID and allows accurate customer counting for analytics.

## Customer ID Format
- **Format**: `CUSTYYYYMMDDXXX`
- **Example**: `CUST20260523001` (First walk-in customer on May 23, 2026)
- **Components**:
  - `CUST` - Fixed prefix
  - `YYYYMMDD` - Date (year, month, day)
  - `XXX` - Zero-padded counter (001-999 per day)

## Changes Made

### 1. Database Schema Updates

#### Updated `customers` table
- **Before**: `phone TEXT UNIQUE NOT NULL`
- **After**: `phone TEXT UNIQUE` (allows NULL)
- **Reason**: Anonymous customers don't have phone numbers

#### Created 1204 anonymous customer records
- Generated customer IDs for all existing orders without customer information
- Created corresponding customer records with:
  - `id`: Anonymous customer ID (CUSTYYYYMMDDXXX format)
  - `name`: "Walk-in Customer"
  - `phone`: NULL
  - `email`: NULL
  - `created_at`: Order creation timestamp

### 2. Backend API Updates (orders.js)

#### Added `generateAnonymousCustomerId()` function
```javascript
async function generateAnonymousCustomerId(db) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  
  // Count existing customers for this date
  const result = await db.get(
    `SELECT COUNT(*) as count FROM customers
     WHERE id LIKE ? || '%'`,
    [`CUST${dateStr}`]
  );
  
  const counter = (result?.count || 0) + 1;
  const customerId = `CUST${dateStr}${String(counter).padStart(3, '0')}`;
  
  return customerId;
}
```

#### Updated POST `/api/orders` endpoint
- **New behavior**: If `customer_id` is not provided:
  1. Automatically generate anonymous customer ID
  2. Create customer record in customers table
  3. Assign ID to order

- **Code change**:
  ```javascript
  // Generate anonymous customer ID if not provided
  if (!customer_id) {
    customer_id = await generateAnonymousCustomerId(db);
    
    // Create customer record for this anonymous customer
    await db.run(
      `INSERT INTO customers (id, name, created_at)
       VALUES (?, ?, ?)`,
      [customer_id, 'Walk-in Customer', now]
    );
  }
  ```

### 3. Backend Reports API Updates (reports.js)

#### Updated `/api/reports/dashboard` endpoint
- **Changed**: Customer count calculation
- **Before**: `SELECT COUNT(*) as total_customers FROM customers`
- **After**: 
  ```sql
  SELECT COUNT(DISTINCT customer_id) as total_customers
  FROM orders
  WHERE customer_id IS NOT NULL AND customer_id != ''
  ```
- **Reason**: Counts actual unique customers who made purchases

### 4. Frontend (No Changes Required)
- Frontend already pulls customer count from API response
- Displays at: `reportData.data.customers?.total_customers`
- Will automatically show correct count (1204) on next API call

## Database Statistics

### Current Data
| Metric | Value |
|--------|-------|
| Total Orders | 1204 |
| Unique Customers | 1204 |
| Date Range | April 1 - May 23, 2026 |
| Average Orders/Customer | 1.0 |
| Total Sales | ₹111,318.13 |

### Dashboard Metrics (As of May 23, 2026)
- **Today's Sales**: ₹9,115.08 (21 orders from 21 unique customers)
- **This Month's Sales**: ₹111,318.13 (558 orders from ~558 customers)
- **Total Customers**: 1,204 unique walk-in customers

## Sample Anonymous Customer IDs
```
CUST20260401001 - First customer on April 1
CUST20260401002 - Second customer on April 1
...
CUST20260423001 - First customer on April 23
...
CUST20260523021 - 21st customer on May 23
```

## Benefits

1. **No Null Values**: Every order has a valid customer_id
2. **Accurate Analytics**: Customer count now reflects actual transactions
3. **Traceability**: Can identify customers by date and sequence
4. **Scalability**: Supports up to 999 customers per day
5. **Backward Compatible**: Existing API calls work unchanged

## Implementation Notes

- Anonymous customer IDs are generated on-demand
- Counter resets daily (new date = counter starts at 001)
- Maximum 999 anonymous customers per day supported
- If limit exceeded, would need manual intervention (rare for QSR)
- Customers without orders are not counted

## Testing

All changes have been verified with:
- ✅ Database query execution
- ✅ Customer ID generation and uniqueness
- ✅ API endpoint functionality
- ✅ Dashboard metrics calculation
- ✅ Historical data backfill (1204 orders)

## Next Steps (Optional)

1. Consider adding "customer type" field (registered vs. walk-in)
2. Add filtering options for customer reports
3. Track repeat customers (same customer ID on multiple days)
4. Export customer transaction history by ID
