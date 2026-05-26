# Render Deployment Login Failure - Fix Guide

## Issues Identified & Fixed

### 1. **CORS Origin Configuration** ✅ FIXED
- **Problem**: Frontend requests from Render URL (bttwpos.onrender.com) were being blocked
- **Fix**: Updated `.env` to allow multiple CORS origins
- **Change**: `CORS_ORIGIN=http://localhost:5173,https://bttwpos.onrender.com`

### 2. **Express CORS Middleware** ✅ FIXED
- **Problem**: CORS middleware wasn't parsing multiple origins correctly
- **Fix**: Updated `backend/src/index.js` to split and parse comma-separated origins
```javascript
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
```

### 3. **Render Build Configuration** ✅ FIXED
- **Problem**: Render might not know how to build both frontend and backend
- **Fix**: Created `render.yaml` with proper build and start commands
- **Build Command**: `cd backend && npm install && npm run build`
- **Start Command**: `cd backend && npm start`

### 4. **Environment Variables**
- **DATABASE_URL**: Already set correctly to Render PostgreSQL
- **HOST**: Set to `0.0.0.0` (needed for Render deployment)
- **NODE_ENV**: Set to `production`

## Manual Deployment Steps

### Step 1: Push Changes to GitHub
```bash
cd /path/to/B2TW-POS-App
git add -A
git commit -m "Fix Render deployment: Add render.yaml, update CORS origins"
git push origin master
```

### Step 2: Trigger Render Deployment
- Go to: https://dashboard.render.com
- Find the bttwpos service
- Click "Manual Deploy" or "Trigger Deploy"
- Wait for deployment to complete (check logs for success)

### Step 3: Test Login
Once deployed, navigate to: https://bttwpos.onrender.com

**Demo Credentials:**
- Username: `admin`
- Password: `password`

*Also available: `manager` / `password` and `operator` / `password`*

## Database Initialization

If the login still fails with "Invalid username or password":

### Option A: Initialize via Backend API (Recommended)
The database should auto-initialize when the server starts, but if it fails silently:

1. SSH into the Render service or check logs for errors
2. The initialization runs automatically on first server start
3. Check Render logs for: `✅ Demo staff users created`

### Option B: Manual Database Initialization

If you have access to the Render PostgreSQL database:

```sql
-- Create staff users manually if they don't exist
INSERT INTO staff_users (id, username, password_hash, full_name, email, role, is_active)
VALUES (
  'admin-001',
  'admin',
  '$2b$10$...', -- bcrypt hash of "password"
  'Admin User',
  'admin@b2tw.com',
  'admin',
  true
);
```

To generate bcrypt hash of "password":
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('password', 10).then(h => console.log(h));"
```

## Troubleshooting Checklist

- [ ] Changes committed and pushed to GitHub
- [ ] Render dashboard shows new deployment queued/in progress
- [ ] Check Render logs for "Database initialization" and "Demo staff users created"
- [ ] CORS error fixed (frontend can now make requests to /api/auth/login)
- [ ] Frontend is being served from `frontend/dist`
- [ ] Demo users exist in the `staff_users` table

## Common Issues & Solutions

### Issue: "CORS error: Origin not allowed"
**Solution**: Verify CORS_ORIGIN env var includes the Render domain
```
Expected: http://localhost:5173,https://bttwpos.onrender.com
```

### Issue: "Invalid username or password" even with correct credentials
**Solution**: Check if staff_users table is empty
- Verify `init.js` ran on server startup (check logs)
- Manually seed users if initialization failed

### Issue: Frontend shows blank page
**Solution**: Ensure frontend build completed
- Check build logs: `npm run build` should create `frontend/dist`
- Verify Express is serving `frontend/dist` correctly

## Files Modified

1. **backend/.env** - Added Render URL to CORS_ORIGIN, set HOST=0.0.0.0
2. **backend/src/index.js** - Updated CORS middleware to parse multiple origins
3. **render.yaml** (NEW) - Render deployment configuration

## Next Steps After Login Works

1. Test complete order flow
2. Verify database operations (create order, etc.)
3. Check if frontend features are working
4. Monitor Render logs for any runtime errors

## Support

If issues persist:
1. Check Render service logs: https://dashboard.render.com → bttwpos → Logs
2. Verify DATABASE_URL environment variable is set correctly
3. Look for "Database initialization failed" errors
4. Check if PostgreSQL database is accessible

---

**Status**: All identified issues fixed. Ready for redeployment.
