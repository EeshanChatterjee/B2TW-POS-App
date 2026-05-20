# Phase 2 Backend API Reference

## Base URL
```
http://localhost:5000/api
```

All responses follow this format:
```json
{
  "success": true,
  "data": { /* response data */ },
  "error": null
}
```

---

## Product Endpoints

### GET /products
Get all products with optional category filter

**Query Parameters:**
- `category` (optional): Filter by category name

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 10,
    "products": [
      {
        "id": 1,
        "name": "Grilled Chicken Wrap",
        "category": "Food",
        "price": 150,
        "description": "Tender chicken with fresh veggies",
        "is_active": 1,
        "created_at": "2026-05-20T10:00:00.000Z"
      }
    ]
  }
}
```

### GET /products/:id
Get a single product by ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Grilled Chicken Wrap",
    "category": "Food",
    "price": 150,
    "description": "Tender chicken with fresh veggies",
    "is_active": 1
  }
}
```

### GET /products/categories/list
Get all available product categories

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 3,
    "categories": ["Food", "Beverages", "Sides"]
  }
}
```

### POST /products (Admin)
Create a new product

**Body:**
```json
{
  "name": "Grilled Chicken Wrap",
  "category": "Food",
  "price": 150,
  "description": "Optional description",
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "message": "Product created successfully"
  }
}
```

### PUT /products/:id (Admin)
Update a product

**Body:** (all fields optional)
```json
{
  "name": "New name",
  "price": 200,
  "is_active": false
}
```

### DELETE /products/:id (Admin)
Soft delete a product (marks as inactive)

---

## Order Endpoints

### POST /orders
Create a new order

**Body:**
```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 150
    },
    {
      "product_id": 2,
      "quantity": 1,
      "price": 80
    }
  ],
  "customer_id": "uuid-optional",
  "payment_method": "cash"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid-string",
    "total_amount": 380,
    "status": "pending",
    "message": "Order created successfully"
  }
}
```

### GET /orders
Get all orders with filters

**Query Parameters:**
- `status`: pending | completed | cancelled
- `customer_id`: Filter by customer
- `limit`: Default 50
- `offset`: For pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5,
    "orders": [
      {
        "id": "uuid",
        "customer_id": null,
        "payment_method": "cash",
        "status": "pending",
        "total_amount": 380,
        "created_at": "2026-05-20T10:00:00.000Z"
      }
    ]
  }
}
```

### GET /orders/:id
Get order details with items

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customer_id": null,
    "payment_method": "cash",
    "status": "pending",
    "total_amount": 380,
    "created_at": "2026-05-20T10:00:00.000Z",
    "items": [
      {
        "order_id": "uuid",
        "product_id": 1,
        "quantity": 2,
        "unit_price": 150,
        "total_price": 300
      }
    ]
  }
}
```

### PUT /orders/:id
Update order status

**Body:**
```json
{
  "status": "completed"
}
```

### POST /orders/:id/complete
Mark order as completed

---

## Bill Endpoints

### POST /bills
Create a bill from an order

**Body:**
```json
{
  "order_id": "uuid",
  "customer_phone": "9876543210" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bill_id": "uuid",
    "bill_number": "B000001",
    "order_id": "uuid",
    "total_amount": 380,
    "items": [
      {
        "name": "Grilled Chicken Wrap",
        "quantity": 2,
        "unit_price": 150,
        "total_price": 300
      }
    ],
    "customer": null,
    "message": "Bill created successfully"
  }
}
```

### GET /bills
Get all bills with filters

**Query Parameters:**
- `status`: pending | printed | cancelled
- `limit`: Default 50
- `offset`: For pagination

### GET /bills/:id
Get bill details

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_id": "uuid",
    "bill_number": "B000001",
    "customer_id": null,
    "total_amount": 380,
    "payment_method": "cash",
    "status": "pending",
    "created_at": "2026-05-20T10:00:00.000Z",
    "items": [
      {
        "name": "Product Name",
        "quantity": 2,
        "unit_price": 150,
        "total_price": 300
      }
    ],
    "customer": null
  }
}
```

### POST /bills/:id/print
Print bill to thermal printer

**Response:**
```json
{
  "success": true,
  "data": {
    "bill_id": "uuid",
    "message": "Bill printed successfully"
  }
}
```

### POST /bills/:id/cancel
Cancel a bill

**Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

---

## Redux State Structure (Frontend)

The API responses map to Redux state as follows:

```typescript
// Cart slice
{
  items: [{ product_id, name, quantity, price, total }],
  totalAmount: 380,
  itemCount: 3
}

// Order slice
{
  currentOrderId: "uuid",
  paymentMethod: "cash",
  printStatus: "pending",
  billNumber: "B000001"
}

// Auth slice
{
  isLoggedIn: false,
  username: null,
  role: null,
  token: null
}

// Customer slice
{
  selectedCustomer: null,
  recentCustomers: [],
  searchResults: []
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Product not found",
    "code": 404
  }
}
```

---

## Testing Endpoints

Test the API is running:
```bash
curl http://localhost:5000/api/health
```

Get all products:
```bash
curl http://localhost:5000/api/products
```

Get categories:
```bash
curl http://localhost:5000/api/products/categories/list
```
