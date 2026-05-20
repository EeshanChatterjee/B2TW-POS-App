# Database Schema

## Overview

SQLite database for the Bao to the Wings POS system. Tables are organized around core business entities: products, customers, orders, and bills.

## Tables

### `products`
Menu items and beverages catalog.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique product ID (UUID) |
| name | TEXT | NOT NULL | Product name |
| category | TEXT | NOT NULL | Category (Main, Sides, Beverages, etc.) |
| price | REAL | NOT NULL | Price in INR |
| description | TEXT | - | Optional product description |
| is_active | BOOLEAN | DEFAULT 1 | Active/inactive flag |
| is_beverage | BOOLEAN | DEFAULT 0 | Flag for beverage items |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes:** `idx_products_category`

**Sample Data:**
```sql
INSERT INTO products (id, name, category, price, is_beverage)
VALUES ('prod-001', 'Bao - Chicken', 'Main', 150, 0);
```

### `customers`
Customer information for CRM and order history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique customer ID (UUID) |
| phone | TEXT | UNIQUE, NOT NULL | Customer phone number (unique identifier) |
| name | TEXT | - | Customer name |
| email | TEXT | - | Customer email address |
| is_active | BOOLEAN | DEFAULT 1 | Active/inactive flag |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Registration timestamp |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes:** `idx_customers_phone`

**Notes:**
- Phone number is the primary lookup key
- Optional name and email for CRM features
- Can be updated during checkout

### `orders`
Main transaction records for each customer order.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique order ID (UUID) |
| customer_id | TEXT | FK(customers.id) | Reference to customer (optional) |
| total_amount | REAL | NOT NULL | Total order amount in INR |
| status | TEXT | DEFAULT 'completed' | Status: completed, cancelled, pending |
| payment_method | TEXT | - | Payment method: cash, card, upi |
| notes | TEXT | - | Order notes/special requests |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Order timestamp |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes:** `idx_orders_customer_id`, `idx_orders_created_at`

**Relationships:**
- One customer → Many orders
- One order → Many order_items

### `order_items`
Line items for each order (what was ordered).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique line item ID (UUID) |
| order_id | TEXT | FK(orders.id) | Reference to order |
| product_id | TEXT | FK(products.id) | Reference to product |
| quantity | INTEGER | NOT NULL | Quantity ordered |
| unit_price | REAL | NOT NULL | Price per unit at time of order |
| total_price | REAL | NOT NULL | quantity × unit_price |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Indexes:** `idx_order_items_order_id`, `idx_order_items_product_id`

**Relationships:**
- One order → Many order_items
- One product → Many order_items

### `bills`
Printed bills with cancellation tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique bill ID (UUID) |
| order_id | TEXT | UNIQUE FK(orders.id) | Reference to order (one-to-one) |
| bill_number | INTEGER | - | Sequential bill number for receipt |
| is_cancelled | BOOLEAN | DEFAULT 0 | Cancellation flag |
| cancellation_reason | TEXT | - | Reason for cancellation |
| cancellation_date | DATETIME | - | When bill was cancelled |
| cancelled_by | TEXT | - | Admin username who cancelled |
| printed_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | When bill was printed |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Indexes:** `idx_bills_order_id`, `idx_bills_printed_at`

**Notes:**
- Each order has at most one bill
- Cancellations are soft-deletes (not removed, just marked as cancelled)
- Bill number is used on physical receipts

### `admin_users`
Admin user accounts and roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique user ID (UUID) |
| username | TEXT | UNIQUE, NOT NULL | Login username |
| password_hash | TEXT | NOT NULL | Bcrypt password hash |
| role | TEXT | DEFAULT 'operator' | Role: operator, manager, admin |
| is_active | BOOLEAN | DEFAULT 1 | Account active flag |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Notes:**
- Default admin user: username=`admin`, password=`admin123` (CHANGE IN PRODUCTION)
- Roles: operator (basic POS), manager (reports), admin (full access)

### `kot_logs`
Kitchen Order Ticket printing history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique log ID (UUID) |
| order_id | TEXT | FK(orders.id) | Reference to order |
| status | TEXT | DEFAULT 'pending' | Status: pending, printed, preparing, ready, completed |
| printed_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | When KOT was printed |
| completed_at | DATETIME | - | When order was completed |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Indexes:** `idx_kot_logs_order_id`

**Notes:**
- One KOT per order
- Tracks kitchen workflow state

## Data Flow Example

### Complete Order Workflow:

```
1. Customer arrives
   ↓
2. Teller selects products → Creates CART (in-memory)
   ↓
3. Teller captures/finds customer → CUSTOMER record created/found
   ↓
4. Teller completes order → ORDER record created
   ↓
5. Order items added → ORDER_ITEMS records created
   ↓
6. Payment received → ORDER.payment_method set, ORDER.status = 'completed'
   ↓
7. Bill printed → BILL record created, KOT_LOGS record created
   ↓
8. Kitchen prepares → KOT_LOGS.status updated through workflow
   ↓
9. Order completed → KOT_LOGS.completed_at set
```

## Indexing Strategy

Indices are created on frequently queried columns:

- **Orders by customer:** `idx_orders_customer_id` - for customer order history
- **Orders by date:** `idx_orders_created_at` - for daily reports
- **Customers by phone:** `idx_customers_phone` - for quick lookup
- **Products by category:** `idx_products_category` - for menu filtering
- **Bills by print date:** `idx_bills_printed_at` - for bill reports
- **KOT logs:** `idx_kot_logs_order_id` - for kitchen status

## Constraints & Referential Integrity

- PRAGMA foreign_keys = ON is enabled
- All foreign keys enforce referential integrity
- Customer deletion cascades to orders (if implemented)
- Product deletion not cascaded (historical records)

## Backup & Recovery

SQLite database file: `data/pos.db`

For backups:
```bash
# Simple file backup
cp data/pos.db data/pos.db.backup

# Or use SQLite dump
sqlite3 data/pos.db ".dump" > data/backup.sql
```

## Future Enhancements

- Inventory tracking (quantity_available per product)
- Employee/operator tracking (user_id in orders)
- Modifier options (extra toppings, spice levels)
- Discount/coupon system
- Tax calculation and compliance
- Audit logs for admin actions
