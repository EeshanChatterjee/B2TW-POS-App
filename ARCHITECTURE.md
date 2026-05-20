# Architecture Overview

## Project Structure

```
B2TW-POS/
├── backend/                          # Node.js/Express Server
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.sql           # ✅ SQLite database schema
│   │   │   ├── init.js              # ✅ Database initialization
│   │   │   └── connection.js        # ✅ Database connection pool
│   │   ├── middleware/
│   │   │   └── errorHandler.js      # ✅ Global error handling
│   │   ├── utils/
│   │   │   └── printerService.js    # ✅ ESC/POS printer integration
│   │   ├── api/                     # TODO: Route controllers
│   │   │   ├── products.js
│   │   │   ├── orders.js
│   │   │   ├── customers.js
│   │   │   ├── bills.js
│   │   │   └── auth.js
│   │   └── index.js                 # ✅ Express server entry point
│   ├── package.json                 # ✅ Dependencies & scripts
│   ├── .env.example                 # ✅ Configuration template
│   └── data/                        # SQLite database (auto-created)
│
├── frontend/                         # React/TypeScript Application
│   ├── src/
│   │   ├── pages/                   # ✅ Page components (placeholders)
│   │   │   ├── TellerScreen.tsx     # Main POS interface
│   │   │   ├── AdminPanel.tsx       # Admin dashboard
│   │   │   └── LoginPage.tsx        # Admin login
│   │   ├── components/              # TODO: React components
│   │   │   ├── ProductGrid/
│   │   │   ├── ShoppingCart/
│   │   │   ├── BillPreview/
│   │   │   └── AdminDashboard/
│   │   ├── services/
│   │   │   └── api.ts              # ✅ API client with axios
│   │   ├── store/                   # ✅ Redux state management
│   │   │   ├── index.ts
│   │   │   └── slices/
│   │   │       ├── cartSlice.ts
│   │   │       ├── orderSlice.ts
│   │   │       ├── authSlice.ts
│   │   │       └── customerSlice.ts
│   │   ├── hooks/
│   │   │   └── useStore.ts         # ✅ Typed Redux hooks
│   │   ├── index.css               # ✅ Tailwind + custom styles
│   │   ├── App.tsx                 # ✅ Main app component
│   │   └── main.tsx                # ✅ React entry point
│   ├── public/
│   │   └── index.html              # ✅ HTML template
│   ├── package.json                # ✅ Dependencies & scripts
│   ├── vite.config.ts              # ✅ Build configuration
│   ├── tsconfig.json               # ✅ TypeScript config
│   ├── tailwind.config.js           # ✅ Tailwind CSS config
│   └── postcss.config.js            # ✅ PostCSS config
│
├── docs/                            # Documentation
│   ├── DATABASE_SCHEMA.md           # ✅ Database design
│   ├── API_REFERENCE.md             # ✅ API endpoints
│   ├── PRINTER_SETUP.md             # ✅ Printer configuration
│   └── DEPLOYMENT.md                # ✅ Deployment instructions
│
├── TASKS.md                         # Project task tracking
├── README.md                        # ✅ Project overview
├── ARCHITECTURE.md                  # This file
└── .gitignore                       # ✅ Git ignore rules
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ with ES Modules
- **Framework**: Express.js (REST API)
- **Database**: SQLite3 (local persistence)
- **Printer**: ESC/POS over Serial/Bluetooth
- **Dependencies**:
  - `express` - Web framework
  - `sqlite3` + `sqlite` - Database driver
  - `serialport` - Serial communication
  - `escpos` - Thermal printer protocol
  - `uuid` - ID generation
  - `dotenv` - Configuration

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit
- **Build Tool**: Vite (fast HMR)
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Router**: React Router v6
- **Dependencies**:
  - `react-redux` - Redux React bindings
  - `@reduxjs/toolkit` - Redux utilities
  - `axios` - HTTP requests
  - `date-fns` - Date formatting
  - `lucide-react` - Icon library

## Data Flow

### Order Creation Flow

```
User Input (Teller Screen)
    ↓
Add Product to Cart (Redux cartSlice)
    ↓
Cart State Updated (visual feedback)
    ↓
Customer Lookup/Input (CRM)
    ↓
Payment Method Selection
    ↓
Submit Order (API POST /orders)
    ↓
Backend Validation
    ↓
Insert ORDER + ORDER_ITEMS (SQLite)
    ↓
Generate Bill Number
    ↓
Print Bill (Thermal Printer)
    ↓
Print KOT (Kitchen Printer)
    ↓
Response to Frontend (order confirmation)
    ↓
Clear Cart (Redux)
    ↓
Ready for Next Order
```

### State Management (Redux)

```
RootState
├── cart
│   ├── items: CartItem[]
│   └── total: number
├── order
│   ├── currentOrderId: string
│   ├── paymentMethod: 'cash' | 'card' | 'upi'
│   ├── printStatus: 'idle' | 'printing' | 'success' | 'error'
│   └── billNumber: number
├── auth
│   ├── isLoggedIn: boolean
│   ├── username: string
│   ├── role: 'operator' | 'manager' | 'admin'
│   └── token: string
└── customer
    ├── selectedCustomer: Customer
    ├── recentCustomers: Customer[]
    └── searchResults: Customer[]
```

### Database Schema Relationships

```
CUSTOMERS (1) ──→ (M) ORDERS
                       ↓
                   ORDER_ITEMS
                       ↓
                   PRODUCTS
                       
ORDERS (1) ──→ (1) BILLS

ORDERS (1) ──→ (1) KOT_LOGS

ADMIN_USERS
├── username (unique)
└── role-based access
```

## API Architecture

```
Client (React)
    ↓
Vite Dev Server (5173) / Production Server (3000)
    ↓
Proxy to Backend (http://localhost:5000)
    ↓
Express.js Server (5000)
    ├── Authentication Middleware
    ├── Response Wrapper
    ├── Error Handler
    ↓
Route Controllers
    ├── /api/products
    ├── /api/orders
    ├── /api/customers
    ├── /api/bills
    ├── /api/reports
    └── /api/printer
    ↓
Services Layer
    ├── Order Service (validation, calculation)
    ├── Customer Service (CRM)
    ├── Bill Service
    └── Printer Service (ESC/POS)
    ↓
SQLite Database
    └── /data/pos.db
```

## Component Hierarchy

```
App
├── Router
│   ├── LoginPage
│   │   └── LoginForm
│   ├── TellerScreen (Main POS)
│   │   ├── ProductGrid
│   │   │   ├── CategoryFilter
│   │   │   └── ProductCard[] (add to cart)
│   │   ├── ShoppingCart
│   │   │   ├── CartItem[]
│   │   │   └── CartSummary
│   │   ├── CustomerSection
│   │   │   ├── CustomerLookup
│   │   │   └── CustomerProfile
│   │   └── CheckoutPanel
│   │       ├── PaymentMethod
│   │       ├── Total Display
│   │       └── Checkout Button
│   └── AdminPanel
│       ├── Sidebar (navigation)
│       ├── Dashboard
│       ├── MenuManagement
│       ├── Reports
│       ├── BillHistory
│       └── CustomerAnalytics
```

## Build & Deploy Flow

```
Development
├── npm run dev (backend)
│   └── Auto-reload on file changes
├── npm run dev (frontend)
│   └── Hot Module Reload (HMR)
└── SQLite at ./data/pos.db

Production
├── npm run build (frontend)
│   ├── TypeScript compilation
│   ├── Code splitting
│   ├── Minification
│   └── Output: dist/
├── npm start (backend)
│   └── Express server
├── Serve frontend (dist/ or separate server)
└── SQLite at configured DATABASE_URL
```

## Security Considerations

### Authentication
- JWT tokens for admin routes
- Session management
- Password hashing (bcrypt - to be implemented)

### Data Protection
- Foreign key constraints enabled
- Input validation on API layer
- CORS configured
- SQL injection prevention (parameterized queries)

### Production Checklist
- [ ] Change default admin credentials
- [ ] Generate new JWT secret
- [ ] Enable HTTPS (if cloud-hosted)
- [ ] Setup proper logging
- [ ] Implement rate limiting
- [ ] Regular database backups
- [ ] Secure .env variables

## Scalability Path

### Phase 1: Current (Single Location)
- Local SQLite database
- Single backend instance
- Basic reporting

### Phase 2: Multiple Locations
- Central PostgreSQL database
- SQLite sync mechanism
- Cloud-hosted backend
- Multi-location dashboard

### Phase 3: Enterprise
- Multi-tenant support
- Advanced reporting/BI
- API for third-party integrations
- Mobile apps
- Real-time inventory

## Performance Metrics

### Target Performance
- Page load: <2 seconds
- API response: <500ms
- Print time: <3 seconds per ticket
- Database query: <100ms for standard queries

### Optimization Done
- Vite for fast builds
- Code splitting in React
- Redux for state efficiency
- SQLite with proper indexes
- Compressed assets

### Future Optimizations
- Redis caching (if cloud-deployed)
- Database query optimization
- Component lazy loading
- Image optimization
- Service Worker for offline

## Development Guidelines

### Code Organization
1. Keep components small and reusable
2. Use Redux for shared state
3. API calls in services layer
4. Styling with Tailwind utility classes
5. Types in TypeScript

### Database Migrations
1. Edit schema.sql
2. Create migration script in db/migrations/
3. Test with fresh database
4. Document changes

### Adding New Features
1. Update database schema if needed
2. Create API endpoint
3. Write Redux slice for state
4. Create React components
5. Test end-to-end

## Troubleshooting Guide

### Backend Issues
- Check backend/.env configuration
- Verify database initialized: `npm run db:init`
- Check printer connection: `curl http://localhost:5000/api/printer/status`
- Review logs for errors

### Frontend Issues
- Clear browser cache
- Check Redux DevTools extension
- Verify API proxy in vite.config.ts
- Check network requests in browser DevTools

### Database Issues
- Verify SQLite permissions
- Check database file exists
- Review foreign key constraints
- Check connection pool settings

## Next Implementation Steps

1. **Phase 2: Implement API Routes**
   - Create product routes (/api/products)
   - Create order routes (/api/orders)
   - Create customer routes (/api/customers)
   - Create bill routes (/api/bills)
   - Create auth routes (/api/auth)
   - Add printer routes (/api/printer)

2. **Phase 3: Build UI Components**
   - Product grid with categories
   - Shopping cart management
   - Bill preview/printing
   - Customer lookup
   - Admin dashboard
   - Sales reports

3. **Phase 4: Integration**
   - Wire up Redux to components
   - Connect API services
   - Test order flow end-to-end
   - Test printer integration
   - Test CRM functionality

4. **Phase 5: Testing & Refinement**
   - Unit tests for services
   - Integration tests for API
   - UI testing with sample data
   - Performance testing
   - User acceptance testing

## References

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [SQLite Documentation](https://www.sqlite.org/)
- [ESC/POS Specification](https://www.epson.com/cgi-bin/Store/pl/Control_Parameter_en.jsp)
- [Tailwind CSS](https://tailwindcss.com/)
