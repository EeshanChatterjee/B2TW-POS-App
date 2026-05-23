# B2TW POS - Reporting Module Testing Protocol

**Version:** 1.0  
**Date:** May 23, 2026  
**Module:** Reports & Analytics Dashboard  
**Status:** Ready for Testing

---

## Table of Contents
1. [Overview](#overview)
2. [Test Scope](#test-scope)
3. [Test Environment Setup](#test-environment-setup)
4. [API Endpoint Tests](#api-endpoint-tests)
5. [Frontend UI Tests](#frontend-ui-tests)
6. [Data Accuracy Tests](#data-accuracy-tests)
7. [Edge Cases & Error Handling](#edge-cases--error-handling)
8. [Performance Tests](#performance-tests)
9. [Integration Tests](#integration-tests)
10. [Test Execution Checklist](#test-execution-checklist)

---

## Overview

The Reporting Module provides 11 different report views across 12 API endpoints. This protocol ensures comprehensive testing of functionality, data accuracy, error handling, and performance.

### Reports Tested
1. Dashboard (Overview)
2. Sales Report
3. Category Sales
4. Top Products
5. Customer Analytics
6. Revenue Report (by day/week/month)
7. Today vs Last Week
8. Day of Week Comparison
9. Month over Month
10. Inventory Status
11. Accounting & Tax

---

## Test Scope

### In Scope
- All 12 API endpoints in `/api/reports/`
- Frontend UI rendering for all 11 report types
- Date range filtering
- CSV export functionality
- Data accuracy and calculations
- Error handling and edge cases
- Performance with various data sizes
- Database query efficiency

### Out of Scope
- Browser-specific rendering bugs (cross-browser testing)
- Print functionality (beyond CSV export)
- Real-time data streaming
- Historical data before April 1, 2026

---

## Test Environment Setup

### Prerequisites
- Database populated with April 1 - May 23, 2026 data
- Test accounts with admin privileges
- Backend server running on `localhost:5000`
- Frontend running on `localhost:3000`
- Browser dev tools open for network monitoring

### Data Requirements
- **Minimum:** 387 orders with line items across multiple categories
- **Preferred:** 22 days of data (April 1 - May 23, 2026)
- **Payment Methods:** Cash, Card, UPI distributions
- **Categories:** Multiple categories with varying sales

### Reset Procedure
```bash
# Restore clean database state
npm run db:reset
npm run ingest:transactions
npm run ingest:order-items
npm run forward-fill:data
```

---

## API Endpoint Tests

### 1. GET `/api/reports/dashboard`

**Description:** Dashboard overview with key metrics

**Test Cases:**

| # | Test Name | Input | Expected Output | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 1.1 | Load Dashboard | No params | 200 + metrics object | | Should auto-calculate today's date |
| 1.2 | Dashboard Fields | No params | today, thisMonth, topProduct, customers | | Verify all keys present |
| 1.3 | Zero Sales Day | Clear orders for today | order_count: 0, total_sales: 0 | | Handle no data gracefully |
| 1.4 | High Volume | 100+ orders today | Correct totals | | Performance check |
| 1.5 | Decimal Precision | Various prices | 2 decimal places | | Currency formatting |

**SQL Verification:**
```sql
-- Verify today's metrics
SELECT COUNT(*) as orders, SUM(total_amount) as sales 
FROM bills WHERE DATE(created_at) = CURRENT_DATE AND status != 'cancelled';
```

---

### 2. GET `/api/reports/sales`

**Description:** Sales data for date range with daily breakdown

**Test Cases:**

| # | Test Name | Input | Expected Output | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 2.1 | Valid Date Range | startDate=2026-05-01, endDate=2026-05-23 | Array of 23 records | | Verify each date has entry |
| 2.2 | Single Day | startDate=endDate=2026-05-15 | 1 record | | Edge case: same start/end |
| 2.3 | Missing Dates | Gaps in data | Only dates with data returned | | Correct handling of gaps |
| 2.4 | No Date Params | (none) | 400 error | | Validation check |
| 2.5 | Invalid Format | startDate=05-23-2026 | 400 error | | Format validation |
| 2.6 | Summary Calculation | Multiple days | totalSales = sum of all days | | Verify aggregation |
| 2.7 | Average Order Value | 10 orders, ₹1000 total | averageOrderValue: 100 | | Calculation accuracy |
| 2.8 | Payment Method Breakdown | Mixed payment methods | breakdown[cash], breakdown[card], breakdown[upi] | | All methods present |

**Data Validation:**
- totalOrders = count of unique bill IDs in range
- totalSales = sum of all bill amounts
- averageOrderValue = totalSales / totalOrders (or 0 if no orders)

---

### 3. GET `/api/reports/top-products`

**Description:** Top N products by revenue

**Test Cases:**

| # | Test Name | Input | Expected Output | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 3.1 | Default Limit | No limit param | Top 10 products | | Verify default is 10 |
| 3.2 | Custom Limit | limit=5 | Exactly 5 products | | Sort by revenue DESC |
| 3.3 | With Date Range | limit=5, dates | Same products within range | | Date filtering works |
| 3.4 | No Sales Period | Dates with no orders | Empty array | | Graceful empty response |
| 3.5 | Top Product Accuracy | Known top product | Matches manual calculation | | Verify revenue order |
| 3.6 | Quantity & Revenue | Product: 10 items @ ₹100 | total_quantity: 10, total_revenue: 1000 | | Calculation check |
| 3.7 | Order Count | Product in 5 orders | order_count: 5 | | Count distinct orders |
| 3.8 | Large Limit | limit=999 | All products or max available | | Handle large requests |

**SQL Verification:**
```sql
SELECT p.name, SUM(oi.quantity) as qty, SUM(oi.total_price) as revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id
WHERE DATE(o.created_at) BETWEEN ? AND ?
GROUP BY p.id
ORDER BY revenue DESC
LIMIT 10;
```

---

### 4. GET `/api/reports/customers`

**Description:** Customer metrics and top customers

**Test Cases:**

| # | Test Name | Input | Expected Output | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 4.1 | Metrics Presence | dates | metrics object with all fields | | total_customers, active_customers, new_customers, avg_spend |
| 4.2 | Top Customers | dates | Array of customers sorted by spend | | Show top 20 by default |
| 4.3 | Customer Stats | Known customer | Correct order_count, total_spent | | Verify calculations |
| 4.4 | Repeat vs New | dates | Distinguish repeat from new | | Check first_order date |
| 4.5 | Avg Spend Calc | 3 customers: ₹100, ₹200, ₹300 | avg_customer_spend: 200 | | Arithmetic accuracy |
| 4.6 | No Customers | Empty customers table | total_customers: 0 | | Handle zero case |
| 4.7 | Phone Field | Customers with/without phone | Both shown in results | | Null values handled |

---

### 5. GET `/api/reports/revenue`

**Description:** Revenue by period (day/week/month) and payment method

**Test Cases:**

| # | Test Name | Input | Expected Output | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 5.1 | Daily Grouping | groupBy=day | Separate row per date | | Default grouping |
| 5.2 | Weekly Grouping | groupBy=week | Grouped by week | | Verify week calculation |
| 5.3 | Monthly Grouping | groupBy=month | Grouped by month | | Month-start boundaries |
| 5.4 | Payment Breakdown | (any) | Breakdown by payment_method | | cash, card, upi keys |
| 5.5 | Missing Dates | Period with no data | Omitted from results | | Correct sparse handling |
| 5.6 | No Params | (none) | 400 error | | Require dates |
| 5.7 | Summary Stats | Multiple periods | totalRevenue, totalOrders, periods count | | Aggregation accuracy |

---

### 6. GET `/api/reports/comparison/today-vs-lastweek`

**Description:** Compare today with same weekday last week

**Test Cases:**

| # | Test Name | Input | Expected Output | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 6.1 | No Params | (none) | today vs -7 days automatically | | Uses system date |
| 6.2 | Growth Calc Positive | today: ₹1000 vs last: ₹500 | sales_pct: 100 | | Up growth % |
| 6.3 | Growth Calc Negative | today: ₹300 vs last: ₹500 | sales_pct: -40 | | Down growth % |
| 6.4 | Zero Division | today: ₹500 vs last: ₹0 | sales_pct: 0 (not NaN) | | Safe division by zero |
| 6.5 | Fields Present | (any) | today, last_week_same_day, growth | | All keys present |

---

### 7. GET `/api/reports/comparison/day-of-week`

**Description:** Sales breakdown by day of week

**Test Cases:**

| # | Test Name | Input | Expected Output | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 7.1 | All Days | dates spanning full week | 7 rows (Sun-Sat) | | Complete week |
| 7.2 | Partial Week | Just Mon-Wed | 3 rows | | Skip missing days |
| 7.3 | Day Names | (any) | day_of_week: "Monday", "Tuesday", etc | | English names |
| 7.4 | Day Order | (any) | Sunday=0 through Saturday=6 | | Correct ordering |
| 7.5 | Sales by Day | Known pattern | Highest/lowest days correct | | Verify aggregation |

---

### 8. GET `/api/reports/comparison/month-over-month`

**Description:** Compare current month with previous month

**Test Cases:**

| # | Test Name | Input | Expected Output | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 8.1 | Default | No params | Current month vs previous | | Auto current month |
| 8.2 | Specific Month | month=2026-05 | May vs April data | | Custom month selection |
| 8.3 | Growth Calc | May: ₹10000 vs April: ₹8000 | sales_pct: 25 | | Percentage calculation |
| 8.4 | Month Format | (any) | current_month.month: "2026-05" | | YYYY-MM format |

---

### 9. GET `/api/reports/category-sales`

**Description:** Sales breakdown by product category

**Test Cases:**

| # | Test Name | Input | Expected Output | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 9.1 | All Categories | dates | One row per category | | Complete breakdown |
| 9.2 | No Date Params | (none) | 400 error | | Dates required |
| 9.3 | Order Count | Category with 10 orders | order_count: 10 | | Distinct orders |
| 9.4 | Total Quantity | 50 items sold | total_quantity: 50 | | Sum all quantities |
| 9.5 | Sales Total | ₹5000 from category | total_sales: 5000 | | Sum all prices |
| 9.6 | Distinct Items | 8 different products | distinct_items: 8 | | Count distinct products |

---

### 10. GET `/api/reports/inventory`

**Description:** Current inventory status with stock levels

**Test Cases:**

| # | Test Name | Input | Expected Output | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 10.1 | All Products | (none) | All active products | | is_active = 1 |
| 10.2 | Filter Category | category=Ramen | Only Ramen products | | Category filter works |
| 10.3 | Low Stock Only | low_stock_only=true | Only low/reorder items | | Filter logic correct |
| 10.4 | Stock Status | Stock < reorder_level | stock_status: "Reorder" | | Status classification |
| 10.5 | Status Options | Various levels | Reorder, Low Stock, Overstock, In Stock | | All 4 statuses appear |
| 10.6 | Missing Inventory | Product no inventory record | current_stock: 0 | | Handle NULL safely |

---

### 11. GET `/api/reports/inventory/summary`

**Description:** Inventory summary statistics

**Test Cases:**

| # | Test Name | Input | Expected Output | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 11.1 | All Fields | (none) | total_items, stock_counts by status | | All keys present |
| 11.2 | Item Count | Known count | Matches product count | | Correct enumeration |
| 11.3 | Status Buckets | (any) | items_to_reorder, low_stock_items, overstock_items | | Accurate categorization |

---

### 12. GET `/api/reports/accounting`

**Description:** Tax and accounting summary

**Test Cases:**

| # | Test Name | Input | Expected Output | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 12.1 | Required Dates | (no dates) | 400 error | | Dates mandatory |
| 12.2 | Payment Breakdown | dates | cash_received, card_received, digital_received | | All payment types |
| 12.3 | Tax Calculation | total_sales: ₹10500 | tax_collected: 500 (at 5%) | | Verify tax math |
| 12.4 | Subtotal | (any) | subtotal = total_sales / 1.05 | | Pre-tax amount |
| 12.5 | Bill Counts | dates | pending_bills, cancelled_bills counts | | Status breakdown |
| 12.6 | Unique Customers | (any) | unique_customers count | | Count distinct |

---

## Frontend UI Tests

### Report Type Switching

| # | Test Name | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| F1.1 | Tab Navigation | Click each report tab | Report view updates | |
| F1.2 | Active State | Click tab | Tab shows active (red border) | |
| F1.3 | Data Refresh | Switch tabs | New report loads, old clears | |
| F1.4 | Scroll Tabs | Tabs overflow | Horizontal scroll works | |

### Date Range Controls

| # | Test Name | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| F2.1 | Show/Hide Dates | Select different reports | Dates hidden for dashboard/today-vs | |
| F2.2 | Date Input | Type dates manually | Dates parsed, report updates | |
| F2.3 | Date Validation | Enter invalid date | Error or ignored | |
| F2.4 | Start > End | startDate after endDate | API error or swap dates | |
| F2.5 | Default Range | Load reports | Default: last 30 days | |

### CSV Export

| # | Test Name | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| F3.1 | Export Button | Click Export CSV | Download triggers | |
| F3.2 | Filename | Export any report | Filename: reporttype-YYYY-MM-DD.csv | |
| F3.3 | CSV Format | Open exported file | Valid CSV with headers | |
| F3.4 | Export Data | (any) | All visible rows in file | |

### Loading & Error States

| # | Test Name | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| F4.1 | Loading State | Change report type | "Loading report..." shown | |
| F4.2 | Error Message | Trigger 500 error | Error text displayed | |
| F4.3 | Empty State | No data available | Graceful empty message | |
| F4.4 | Timeout | Slow endpoint | Shows loading for >2s | |

### Dashboard Metrics Display

| # | Test Name | Data | Expected | Pass/Fail |
|---|-----------|------|----------|-----------|
| F5.1 | Today's Sales | ₹5000 from 10 orders | Displays ₹5000.00 | |
| F5.2 | This Month | ₹50000 from 100 orders | Displays ₹50000.00 | |
| F5.3 | Top Product | Product X: ₹2000 | Shows product name | |
| F5.4 | Customer Count | 50 total customers | Shows 50 | |

### Table Rendering

| # | Test Name | Report | Expected | Pass/Fail |
|---|-----------|--------|----------|-----------|
| F6.1 | Pagination | Sales report, 100+ days | Shows first 30 rows | |
| F6.2 | Hover Effect | Move over row | Row highlights | |
| F6.3 | Currency Format | Numbers | All currency as ₹X.XX | |
| F6.4 | Column Alignment | Tables | Numbers right-aligned | |

---

## Data Accuracy Tests

### Aggregation Accuracy

Create test dataset with known values:

```
Test Orders:
- Order 1: 2026-05-15, ₹1000, Cash
- Order 2: 2026-05-15, ₹500, Card  
- Order 3: 2026-05-16, ₹2000, UPI

Expected Results:
- Date 2026-05-15: Orders=2, Sales=₹1500, Avg=₹750
- Date 2026-05-16: Orders=1, Sales=₹2000, Avg=₹2000
- Payment Breakdown:
  - Cash: ₹1000
  - Card: ₹500
  - UPI: ₹2000
```

**Test Cases:**

| # | Test Name | Query | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| D1.1 | Daily Aggregation | Sales report, 2026-05-15 | ₹1500 | |
| D1.2 | Order Count | Same | 2 orders | |
| D1.3 | Average Calc | Same | ₹750 avg | |
| D1.4 | Payment Breakdown | Same | Correct by method | |
| D1.5 | Multi-day Sum | 2026-05-15 to 2026-05-16 | ₹3500 total | |

### Category Accuracy

Test with multi-item orders:

```
Order A (Category: Baos):
- Soya Bao × 2 @ ₹150 each = ₹300
- Chicken Bao × 1 @ ₹150 = ₹150
Total: ₹450

Order B (Category: Drinks):
- Coke × 1 @ ₹20 = ₹20
- Jeera Soda × 2 @ ₹15 each = ₹30
Total: ₹50
```

**Test Cases:**

| # | Test Name | Expected | Pass/Fail |
|---|-----------|----------|-----------|
| D2.1 | Baos category total | ₹450 | |
| D2.2 | Drinks category total | ₹50 | |
| D2.3 | Baos quantity | 3 items | |
| D2.4 | Baos distinct items | 2 products | |
| D2.5 | Baos order count | 1 order | |

### Customer Calculation

Test with repeat customer:

```
Customer: John
- Order 1: ₹500
- Order 2: ₹750
- Order 3: ₹1000
Total: ₹2250, 3 orders
Avg: ₹750
```

**Test Cases:**

| # | Test Name | Expected | Pass/Fail |
|---|-----------|----------|-----------|
| D3.1 | Total spent | ₹2250 | |
| D3.2 | Order count | 3 | |
| D3.3 | Average order | ₹750 | |

---

## Edge Cases & Error Handling

### Invalid Dates

| # | Test Case | Input | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| E1.1 | Missing dates | No params on date-required reports | 400 Bad Request | |
| E1.2 | Invalid format | "2026-5-1" instead of "2026-05-01" | 400 or auto-parse | |
| E1.3 | Start > End | startDate=2026-05-20, endDate=2026-05-10 | 400 or swap | |
| E1.4 | Future dates | startDate=2099-01-01 | 200 with empty data | |
| E1.5 | Past dates | startDate=2000-01-01 | 200 with empty data | |

### Zero/Empty Data

| # | Test Case | Condition | Expected | Pass/Fail |
|---|-----------|-----------|----------|-----------|
| E2.1 | No orders | Clear all bills | 200, empty arrays | |
| E2.2 | No customers | No customer records | 200, zero metrics | |
| E2.3 | No inventory | No inventory records | 200, all at stock: 0 | |
| E2.4 | Cancelled only | All bills cancelled | 200, zero sales | |

### Large Data Sets

| # | Test Case | Setup | Check | Pass/Fail |
|---|-----------|-------|-------|-----------|
| E3.1 | 1000+ orders | Create bulk orders | Response time < 2s | |
| E3.2 | Large date range | 6-month range | Complete results | |
| E3.3 | High item count | 500+ order_items | Correct aggregation | |

### Database Issues

| # | Test Case | Condition | Expected | Pass/Fail |
|---|-----------|-----------|----------|-----------|
| E4.1 | NULL values | customer_id = NULL | Handled gracefully | |
| E4.2 | Missing relations | order_item with missing product | Graceful error or skip | |
| E4.3 | Cancelled bills | Exclude from all calculations | Not counted | |

---

## Performance Tests

### Response Times

**Standard Dataset:** 22 days (April 1 - May 23, 2026), ~387 orders, ~620 items

| # | Endpoint | Target (ms) | Acceptable (ms) | Measured | Pass/Fail |
|---|----------|-------------|-----------------|----------|-----------|
| P1.1 | /dashboard | <300 | <500 | | |
| P1.2 | /sales | <400 | <800 | | |
| P1.3 | /top-products | <400 | <800 | | |
| P1.4 | /customers | <500 | <1000 | | |
| P1.5 | /revenue | <400 | <800 | | |
| P1.6 | /category-sales | <400 | <800 | | |
| P1.7 | /inventory | <300 | <600 | | |
| P1.8 | /accounting | <400 | <800 | | |

### Query Efficiency

```sql
-- Check query plans for N+1 problems
EXPLAIN QUERY PLAN SELECT ... (for each endpoint)
```

| # | Query | Issue | Status | Pass/Fail |
|---|-------|-------|--------|-----------|
| P2.1 | Top products | Join efficiency | | |
| P2.2 | Customer stats | Aggregation | | |
| P2.3 | Category sales | Group by | | |

### Frontend Performance

| # | Test | Target | Status | Pass/Fail |
|---|------|--------|--------|-----------|
| P3.1 | Report load time | <1s | | |
| P3.2 | Tab switch | <300ms | | |
| P3.3 | CSV export | <2s for dataset | | |
| P3.4 | Table render | <500ms | | |

---

## Integration Tests

### End-to-End Scenarios

**Scenario 1: Daily Manager Review**
1. Load Dashboard
2. Check Today's Sales
3. Review Top Products (last 7 days)
4. Export sales data as CSV
5. Verify numbers match expectations

**Scenario 2: Category Analysis**
1. Go to By Category report
2. Set date range (May 15-20)
3. Verify category totals match sum of products
4. Cross-check against Top Products report

**Scenario 3: Customer Growth Tracking**
1. View Customers report (Apr 1 - May 23)
2. Check Month over Month growth
3. Compare against actual new customers in DB
4. Export top customers

**Scenario 4: Inventory Assessment**
1. Check Inventory Status report
2. Identify low-stock items
3. Export for ordering
4. Verify against manual count

---

## Test Execution Checklist

### Pre-Test
- [ ] Database reset and populated with test data
- [ ] Backend server running (`npm run dev`)
- [ ] Frontend running (`npm run dev`)
- [ ] Browser dev tools open (Console, Network)
- [ ] Test data verified in SQL

### API Tests
- [ ] All 12 endpoints respond with 200
- [ ] Date validation working
- [ ] Error messages appropriate
- [ ] Response times acceptable
- [ ] Data accuracy verified

### Frontend Tests
- [ ] All 11 report tabs load correctly
- [ ] Date pickers work
- [ ] CSV export functioning
- [ ] Tables render properly
- [ ] Error states display

### Data Accuracy
- [ ] Manual SQL queries match API results
- [ ] Calculations verified with test data
- [ ] Aggregations correct
- [ ] No duplicate counting

### Edge Cases
- [ ] Empty datasets handled
- [ ] Invalid inputs rejected
- [ ] Large datasets work
- [ ] NULL values handled

### Performance
- [ ] All endpoints < 800ms
- [ ] Frontend renders < 1s
- [ ] No console errors
- [ ] No memory leaks

### Sign-Off
- [ ] All test cases passed: ___/___
- [ ] Known issues documented: _________
- [ ] Ready for production: Yes / No
- [ ] Tester: _________________ Date: _____

---

## Known Issues & Limitations

### Current Limitations
1. CSV export doesn't handle special characters well
2. Day of week assumes UTC timezone
3. Tax calculation hardcoded at 5%
4. No drill-down from dashboard to details

### Future Enhancements
1. Real-time data refresh
2. Export to Excel/PDF
3. Custom report builder
4. Scheduled email delivery
5. Data visualization charts

---

## Test Results Summary

**Total Test Cases:** 150+
**Critical Path:** Dashboard, Sales, Top Products
**Recommended Test Order:** 
1. API Endpoint Tests
2. Data Accuracy Tests
3. Frontend UI Tests
4. Integration Tests
5. Performance Tests

---

## Approval Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | _____________ | _______ | _______ |
| Dev Lead | _____________ | _______ | _______ |
| Product Manager | _____________ | _______ | _______ |

---

**Document Version:** 1.0  
**Last Updated:** May 23, 2026  
**Next Review:** After implementation of enhancements
