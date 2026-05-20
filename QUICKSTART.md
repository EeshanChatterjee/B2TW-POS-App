# Quick Start Guide

Get the Bao to the Wings POS system up and running in 5 minutes.

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- Git (for version control)
- A 2" thermal printer (optional, for testing)

## Setup

### 1. Install Dependencies (2 minutes)

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

### 2. Initialize Database (1 minute)

```bash
cd backend
npm run db:init
```

This creates the SQLite database with default schema and sample data.

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

### 3. Start Servers (1 minute)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server runs at http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# UI runs at http://localhost:5173
```

### 4. Access the System (1 minute)

- **POS Teller Screen:** http://localhost:5173
- **Admin Panel:** http://localhost:5173/login
- **API Health:** http://localhost:5000/api/health

## Quick Test

### Test API
```bash
curl http://localhost:5000/api/health
```

Should return:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 123.45
  }
}
```

### Test Database
```bash
curl http://localhost:5000/api/db/status
```

Should show product count from database.

### Login to Admin Panel

1. Navigate to http://localhost:5173/login
2. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
3. Click "Login"

## Project Structure

```
├── backend/          # Express.js server
│   ├── src/
│   │   ├── db/       # Database files
│   │   ├── middleware/
│   │   └── utils/
│   └── data/pos.db   # SQLite database
│
├── frontend/         # React app
│   ├── src/
│   │   ├── pages/
│   │   ├── store/    # Redux state
│   │   └── services/ # API client
│   └── dist/         # Production build
│
└── docs/            # Documentation
    ├── DATABASE_SCHEMA.md
    ├── API_REFERENCE.md
    └── DEPLOYMENT.md
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `backend/src/db/schema.sql` | Database structure |
| `backend/src/index.js` | Express server |
| `backend/.env.example` | Configuration template |
| `frontend/src/App.tsx` | Main React app |
| `frontend/src/store/` | Redux state management |

## Development Tips

### Hot Reload
- **Backend:** Auto-restarts on file changes (using `--watch`)
- **Frontend:** Hot Module Reload (HMR) - see changes instantly

### Database
- Location: `backend/data/pos.db`
- SQLite file-based, no external DB needed
- Reset: Delete file and run `npm run db:init`

### Redux DevTools
Install [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools-extension) for Chrome to see state changes.

### API Testing
Use curl, Postman, or VS Code REST Client to test endpoints:

```bash
# Get products
curl http://localhost:5000/api/products

# Create order (example)
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [], "payment_method": "cash"}'
```

## Common Issues

### Port Already in Use

```bash
# Change port in backend/.env
PORT=8000

# Or kill process using port
# Linux/Mac:
lsof -i :5000
kill -9 <PID>

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Node Modules Issues

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database Errors

```bash
# Reset database
cd backend
rm data/pos.db
npm run db:init
```

### Can't Connect to Backend

```bash
# Verify backend is running
curl http://localhost:5000/api/health

# Check CORS configuration
# Edit backend/.env: CORS_ORIGIN=http://localhost:5173
```

## Next Steps

1. ✅ **Architecture & Setup** (complete)
2. ⏭️ **Build API Routes** - Implement /products, /orders, /customers endpoints
3. ⏭️ **Build Teller Screen UI** - Product grid, cart, checkout
4. ⏭️ **Build Admin Panel** - Menu management, reports, bill editing
5. ⏭️ **Integrate Printer** - Wire up thermal printer
6. ⏭️ **Test & Deploy** - Full QA and food truck deployment

## Documentation

- **[README.md](./README.md)** - Project overview
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture
- **[docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** - Database design
- **[docs/API_REFERENCE.md](./docs/API_REFERENCE.md)** - API endpoints
- **[docs/PRINTER_SETUP.md](./docs/PRINTER_SETUP.md)** - Printer configuration
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Deployment guide

## Support

If something doesn't work:

1. Check the logs in `backend/` terminal
2. Review the relevant documentation file
3. Verify prerequisites are installed
4. Try the "Common Issues" section above

---

**Happy coding! 🚀 Let's build an awesome POS system for Bao to the Wings!**
