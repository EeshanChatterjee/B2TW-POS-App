# Bao to the Wings - POS System

A modern Point of Sale (POS) system designed for QSR food trucks. Built with React, Node.js, SQLite, and ESC/POS thermal printer integration.

## Features

- **Teller Screen**: Fast product selection with cart management
- **Bill & KOT Printing**: 2" thermal printer support (ESC/POS protocol)
- **CRM**: Customer details capture and lookup
- **Admin Panel**: Menu management, reporting, bill editing
- **Offline-First**: Works without internet, syncs when online
- **SQLite Database**: Local persistence with zero external dependencies

## Project Structure

```
B2TW POS App/
├── backend/                    # Node.js/Express server
│   ├── src/
│   │   ├── api/               # API routes
│   │   ├── db/                # Database initialization & migrations
│   │   ├── services/          # Business logic (orders, customers, etc.)
│   │   ├── controllers/       # Route controllers
│   │   ├── middleware/        # Express middleware
│   │   ├── utils/             # Utilities (printer, validation, etc.)
│   │   └── index.js           # Server entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── TellerScreen/  # POS interface
│   │   │   ├── Admin/         # Admin panel
│   │   │   ├── CRM/           # Customer management
│   │   │   └── common/        # Shared components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API calls & data fetching
│   │   ├── store/             # State management (Redux/Context)
│   │   ├── styles/            # Global styles
│   │   ├── utils/             # Utilities
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                       # Documentation
│   ├── DATABASE_SCHEMA.md      # SQLite schema
│   ├── API_REFERENCE.md        # Backend API docs
│   ├── PRINTER_SETUP.md        # Thermal printer configuration
│   └── DEPLOYMENT.md           # Deployment instructions
│
├── TASKS.md                    # Project task tracking
├── README.md                   # This file
└── .gitignore
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | UI/UX for teller & admin screens |
| **State Management** | Redux Toolkit | Global state for orders, cart, etc. |
| **Backend** | Node.js + Express | REST API server |
| **Database** | SQLite3 | Local data persistence |
| **Printer** | ESC/POS Protocol | 2" thermal printer communication |
| **Build** | Vite | Fast development & production builds |

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- 2" Bluetooth thermal printer (ESC/POS compatible)
- Modern browser (Chrome, Safari, Edge)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Runs on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`

### Database Initialization

The SQLite database is auto-initialized on first backend startup. Database file created at `backend/data/pos.db`.

## Key Modules

### 1. Teller Screen
- Product selection grid
- Shopping cart with quantity management
- Running bill total
- Customer lookup/capture
- Payment interface
- Print bill & KOT

### 2. CRM Module
- Customer phone/name lookup
- Customer profile creation
- Order history tracking
- Repeat customer identification

### 3. Admin Panel
- **Menu Management**: Add/edit/delete products
- **Sales Reporting**: Daily/weekly/monthly analytics
- **Bill History**: View & edit past transactions
- **Customer Analytics**: Spending patterns, repeat rates

### 4. Thermal Printer Integration
- ESC/POS protocol implementation
- Bill formatting for 2" thermal paper
- KOT (Kitchen Order Ticket) formatting
- Bluetooth device detection & connectivity

## API Overview

Base URL: `http://localhost:5000/api`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | POST | Admin login |
| `/products` | GET/POST | List & manage menu items |
| `/orders` | POST | Create new order |
| `/orders/:id` | GET | Get order details |
| `/orders/:id/print` | POST | Print bill/KOT |
| `/customers` | GET/POST | Manage customers |
| `/customers/search` | GET | Search by phone/name |
| `/reports/sales` | GET | Sales analytics |
| `/bills/:id/cancel` | POST | Cancel bill |

## Development Workflow

1. **Backend Changes**: Modify files in `backend/src/`, server auto-reloads
2. **Frontend Changes**: Modify files in `frontend/src/`, HMR applies changes instantly
3. **Database Changes**: Update schema in `backend/src/db/schema.sql`, migrations in `backend/src/db/migrations/`
4. **Testing**: Run API tests with `npm run test` in backend folder

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5000
DATABASE_URL=./data/pos.db
PRINTER_PORT=/dev/ttyUSB0  # Update based on your printer
LOG_LEVEL=debug
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```

## Printer Setup

1. Pair 2" thermal printer via Bluetooth
2. Identify the printer's device port (e.g., `/dev/ttyUSB0` on Linux, `COM3` on Windows)
3. Update `PRINTER_PORT` in backend `.env`
4. Test with `/api/printer/test` endpoint

See `docs/PRINTER_SETUP.md` for detailed instructions.

## Database Schema

Tables:
- `products` - Menu items & beverages
- `customers` - Customer information
- `orders` - Transaction records
- `order_items` - Line items per order
- `bills` - Bill records with cancellation tracking
- `admin_users` - Admin authentication

See `docs/DATABASE_SCHEMA.md` for full schema details.

## Next Steps

1. ✅ Review project structure
2. ⏭️ Implement database schema (see Phase 1)
3. ⏭️ Build teller screen UI (see Phase 2)
4. ⏭️ Integrate thermal printer (see Phase 3)
5. ⏭️ Build CRM module (see Phase 4)
6. ⏭️ Build admin panel (see Phase 5)

## Deployment

See `docs/DEPLOYMENT.md` for instructions on packaging and deploying to food truck hardware.

## License

Proprietary - Bao to the Wings

## Support

For questions or issues, contact the development team.
