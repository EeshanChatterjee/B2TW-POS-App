# Deployment Guide

## Overview

Deployment options for Bao to the Wings POS system based on your food truck hardware setup.

## Environment Types

### Development
- Local machine development
- Hot module reloading
- Debug logging enabled
- Default credentials

### Production (Food Truck)
- Optimized builds
- Error logging & monitoring
- Secure configuration
- Offline capabilities

## Deployment Options

## Option 1: Standalone Linux/Mac Computer (Recommended)

Best for food truck operations - single machine runs both frontend and backend.

### Hardware Requirements

- Processor: Intel i5 or equivalent (2+ cores)
- RAM: 4GB minimum, 8GB recommended
- Storage: 500MB SSD
- OS: Ubuntu 20.04 LTS, macOS 11+, Windows 10+
- Network: WiFi or Ethernet for optional cloud sync

### Installation Steps

#### 1. Prerequisites

```bash
# Install Node.js 18+ (LTS)
# Download from https://nodejs.org/

# Verify installation
node --version  # Should be v18+
npm --version
```

#### 2. Clone/Setup Project

```bash
# Navigate to project directory
cd /path/to/B2TW-POS-App

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

#### 3. Database Setup

```bash
cd backend

# Initialize database with schema
npm run db:init

# This creates data/pos.db with sample products
```

#### 4. Production Build

```bash
# Build backend (optional - can run from source)
# No build step needed for Node.js backend

# Build frontend for production
cd frontend
npm run build

# This creates dist/ folder with optimized files
```

#### 5. Start Services

```bash
# Terminal 1 - Backend Server
cd backend
npm start
# Runs on http://localhost:5000

# Terminal 2 - Frontend Server (or serve from dist)
cd frontend

# Option A: Development server
npm run dev
# Runs on http://localhost:5173

# Option B: Serve production build
npm install -g serve
serve -s dist -l 3000
# Runs on http://localhost:3000
```

#### 6. Access POS System

Open browser and navigate to:
- **Teller Screen:** http://localhost:3000
- **Admin:** http://localhost:3000/login

## Option 2: Electron Desktop App (Advanced)

Package as standalone desktop application.

### Setup

```bash
# Install Electron dependencies
npm install --save-dev electron electron-builder

# Configure electron main process
# (setup steps would go in separate file)

# Build desktop app
npm run electron-build

# Creates .dmg (Mac) or .exe (Windows) installer
```

### Advantages
- Works offline completely
- Easy distribution to food truck
- System tray integration
- Auto-update capability

### Disadvantages
- More complex setup
- Larger file size (~200MB)

## Option 3: Docker Container (Enterprise)

For multi-location deployments or cloud hosting.

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Frontend  
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install && npm run build

# Copy source
COPY backend/src ./backend/src
COPY frontend/src ./frontend/src

# Expose ports
EXPOSE 5000 3000

CMD ["sh", "-c", "cd backend && npm start & cd frontend && serve -s dist -l 3000"]
```

## Environment Configuration

### Backend .env (Production)

```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=/data/pos.db
PRINTER_ENABLED=true
PRINTER_PORT=/dev/ttyUSB0
PRINTER_BAUDRATE=9600
JWT_SECRET=your-secret-key-change-this
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000
```

### Security Settings

```bash
# Change default credentials!
# In backend/src/db/init.js, update default admin:
# OLD: username: 'admin', password: 'admin123'
# NEW: username: 'yourname', password: 'secure-password'

# Use bcrypt for password hashing (install bcrypt)
npm install bcrypt

# Hash password before storing
import bcrypt from 'bcrypt'
const hashedPassword = await bcrypt.hash('password', 10)
```

## Automatic Startup (Linux)

Create systemd service for auto-startup:

```bash
# Create service file
sudo nano /etc/systemd/system/b2tw-pos.service

[Unit]
Description=Bao to the Wings POS
After=network.target

[Service]
Type=simple
User=pi  # Change to your user
WorkingDirectory=/home/pi/B2TW-POS-App/backend
ExecStart=/usr/bin/node /home/pi/B2TW-POS-App/backend/src/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable b2tw-pos.service
sudo systemctl start b2tw-pos.service
sudo systemctl status b2tw-pos.service
```

## Database Backup

Regular backups critical for food truck:

```bash
# Backup database daily
cp backend/data/pos.db backend/data/pos.db.backup.$(date +%Y%m%d)

# Or use SQLite dump
sqlite3 backend/data/pos.db ".dump" > backend/data/backup.sql

# Restore from backup
sqlite3 backend/data/pos.db < backup.sql
```

### Automated Backup (Linux Cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cp /path/to/backend/data/pos.db /path/to/backups/pos.db.backup.$(date +\%Y\%m\%d)
```

## Performance Tuning

### Backend Optimization

```bash
# Enable compression
npm install compression

# In index.js:
import compression from 'compression'
app.use(compression())

# Increase connection pool (if using external DB later)
# Use connection pooling for better performance
```

### Frontend Optimization

```bash
# Already configured in vite.config.ts with:
# - Code splitting
# - Minification
# - Asset optimization

# Check bundle size
npm run build
# Shows dist/ folder size
```

## Monitoring & Logging

### Backend Logs

```bash
# Run with logging
NODE_ENV=production npm start > logs/pos.log 2>&1 &

# View logs
tail -f logs/pos.log

# Rotate logs daily (Linux)
# Use logrotate configuration
```

### Health Check Endpoint

```bash
# Monitor server health
curl http://localhost:5000/api/health

# Returns uptime and status
```

## Troubleshooting Deployment

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or change PORT in .env
PORT=8000
```

### Database Lock

```bash
# SQLite can lock if multiple processes access simultaneously
# Solution: Use single backend instance
# Close any other sqlite3 connections

rm backend/data/pos.db-wal
rm backend/data/pos.db-shm
```

### Printer Not Working After Deployment

```bash
# Verify printer device path
ls -la /dev/ttyUSB*

# Test with echo
echo "test" > /dev/ttyUSB0

# Check permissions
sudo chmod 666 /dev/ttyUSB0
```

## Scaling for Multiple Locations (Future)

When expanding to multiple food trucks:

1. **Cloud Backend**: Deploy backend to AWS/GCP/Heroku
2. **Cloud Sync**: SQLite syncs to remote PostgreSQL
3. **Central Dashboard**: Monitor all locations
4. **Inventory Management**: Shared across locations

## Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] Database initialized with schema
- [ ] Printer detected and tested
- [ ] Frontend built (npm run build)
- [ ] Backend .env configured
- [ ] Admin credentials changed from defaults
- [ ] Ports verified (5000 backend, 3000 frontend)
- [ ] Test order to completion
- [ ] Test bill printing
- [ ] Test admin panel
- [ ] Backup strategy in place
- [ ] Logging configured
- [ ] SSL/TLS (if using cloud)

## Support & Troubleshooting

1. Check logs: `backend/logs/*.log`
2. Verify database: `sqlite3 backend/data/pos.db ".tables"`
3. Test API: `curl http://localhost:5000/api/health`
4. Browser console: Check for client-side errors

## Next Steps

After deployment:
1. ✅ Test complete order flow
2. ⏭️ Train staff on POS usage
3. ⏭️ Set up daily backup schedule
4. ⏭️ Monitor performance & logs
5. ⏭️ Plan for feature additions
