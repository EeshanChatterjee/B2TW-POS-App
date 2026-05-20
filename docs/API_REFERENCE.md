# API Reference

Base URL: `http://localhost:5000/api`

## Response Format

All API responses follow a consistent JSON format:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "Error description"
  }
}
```

## Endpoints

### Health & Status

#### Health Check
```
GET /health
```

Returns server status and uptime.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-15T10:30:00Z",
    "uptime": 3600
  }
}
```

#### Database Status
```
GET /db/status
```

Check database connectivity and product count.

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "connected",
    "products": 15
  }
}
```

---

### Authentication

#### Login
```
POST /auth/login
```

Authenticate admin user.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "username": "admin",
    "role": "admin"
  }
}
```

#### Logout
```
POST /auth/logout
```

Logout and invalidate token.

---

### Products

#### List Products
```
GET /products
```

Get all active products.

**Query Parameters:**
- `category` (optional) - Filter by category
- `is_beverage` (optional) - Filter beverages

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prod-001",
      "name": "Bao - Chicken",
      "category": "Main",
      "price": 150,
      "is_beverage": false
    }
  ]
}
```

#### Get Product
```
GET /products/:id
```

Get single product details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prod-001",
    "name": "Bao - Chicken",
    "category": "Main",
    "price": 150,
    "description": "Chicken bao",
    "is_active": true,
    "is_beverage": false
  }
}
```

#### Create Product
```
POST /products
```

Create new menu item (admin only).

**Request:**
```json
{
  "name": "Bao - Paneer",
  "category": "Main",
  "price": 130,
  "description": "Paneer bao",
  "is_beverage": false
}
```

#### Update Product
```
PUT /products/:id
```

Update product details (admin only).

#### Delete Product
```
DELETE /products/:id
```

Deactivate product (soft delete).

---

### Orders

#### Create Order
```
POST /orders
```

Create new order with items.

**Request:**
```json
{
  "customer_id": "cust-001",
  "items": [
    {
      "product_id": "prod-001",
      "quantity": 2,
      "notes": "No onions"
    }
  ],
  "payment_method": "cash",
  "notes": "Extra chilly"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-001",
    "customer_id": "cust-001",
    "items": [ /* order items */ ],
    "total_amount": 300,
    "status": "completed",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Get Order
```
GET /orders/:id
```

Get order details with items.

#### List Orders
```
GET /orders
```

Get all orders with pagination.

**Query Parameters:**
- `limit` - Results per page (default: 50)
- `offset` - Page offset (default: 0)
- `from_date` - Filter from date (ISO 8601)
- `to_date` - Filter to date (ISO 8601)
- `customer_id` - Filter by customer

#### Cancel Order
```
POST /orders/:id/cancel
```

Cancel order and related bill.

**Request:**
```json
{
  "reason": "Customer request"
}
```

---

### Bills

#### Print Bill
```
POST /orders/:id/print/bill
```

Print thermal bill for order.

**Response:**
```json
{
  "success": true,
  "data": {
    "bill_id": "bill-001",
    "order_id": "order-001",
    "bill_number": 42,
    "printed_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Print KOT
```
POST /orders/:id/print/kot
```

Print Kitchen Order Ticket.

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "order-001",
    "printed_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Get Bill
```
GET /bills/:id
```

Get bill details.

#### Cancel Bill
```
POST /bills/:id/cancel
```

Cancel printed bill.

**Request:**
```json
{
  "reason": "Duplicate bill",
  "cancelled_by": "admin"
}
```

---

### Customers

#### Search Customers
```
GET /customers/search
```

Search customers by phone or name.

**Query Parameters:**
- `q` - Search query

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cust-001",
      "phone": "9876543210",
      "name": "Rajesh",
      "email": "raj@example.com"
    }
  ]
}
```

#### Get Customer by Phone
```
GET /customers/phone
```

Lookup customer by phone number (most common).

**Query Parameters:**
- `phone` - Phone number

#### Get Customer
```
GET /customers/:id
```

Get customer profile.

#### Create Customer
```
POST /customers
```

Create new customer.

**Request:**
```json
{
  "phone": "9876543210",
  "name": "Rajesh",
  "email": "raj@example.com"
}
```

#### Update Customer
```
PUT /customers/:id
```

Update customer details.

#### Get Customer History
```
GET /customers/:id/history
```

Get customer's order history.

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": { /* customer data */ },
    "orders": [
      {
        "id": "order-001",
        "total_amount": 300,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total_spent": 1500,
    "visit_count": 5
  }
}
```

---

### Reports & Analytics

#### Sales Report
```
GET /reports/sales
```

Sales metrics for date range.

**Query Parameters:**
- `startDate` - ISO 8601 date
- `endDate` - ISO 8601 date

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "2024-01-01 to 2024-01-15",
    "total_orders": 150,
    "total_revenue": 45000,
    "average_order_value": 300,
    "payment_breakdown": {
      "cash": 35000,
      "card": 8000,
      "upi": 2000
    }
  }
}
```

#### Top Products
```
GET /reports/top-products
```

Most sold products.

**Query Parameters:**
- `limit` - Number of products (default: 10)

#### Customer Metrics
```
GET /reports/customers
```

Customer statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_customers": 280,
    "repeat_customers": 145,
    "new_customers": 15,
    "average_customer_value": 160
  }
}
```

#### Monthly Revenue
```
GET /reports/revenue
```

Revenue trend by month.

---

### Printer

#### Test Printer
```
POST /printer/test
```

Test printer connectivity (prints test page).

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "connected",
    "message": "Test page printed"
  }
}
```

#### Printer Status
```
GET /printer/status
```

Check printer status.

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Server Error - Internal error |

## Rate Limiting

No rate limiting implemented (add if needed for security).

## Authentication

Protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer <jwt-token>
```

## Offline Mode

In offline mode, API calls are queued and synced when connection is restored.
