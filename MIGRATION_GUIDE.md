# Local SQLite to Remote PostgreSQL Migration Guide

## Status
- ✅ Migration scripts created (Python and Node.js versions)
- ❌ Cannot run directly in sandbox (network restrictions)
- ✅ Ready to run on your local machine

## What Will Be Migrated
- **6** categories
- **43** products
- **1204** customers
- **3** staff users
- **183** orders
- **351** order items
- **186** bills
- **3** KOT logs

## How to Run Migration

### Option A: Using Node.js (Recommended)

1. **Navigate to backend folder:**
   ```bash
   cd ~/Documents/Claude/Projects/B2TW\ POS\ App/backend
   ```

2. **Ensure dependencies are installed:**
   ```bash
   npm install
   ```

3. **Run migration script:**
   ```bash
   DATABASE_URL="postgresql://eeshan:UN2wrF1fwk3bVFsJJcVg284AZpPs3Hx6@dpg-d8ad877avr4c73dejlc0-a.oregon-postgres.render.com/bttwpos" \
   node migrate-sqlite-to-postgres.js
   ```

### Option B: Using Python

Requires psycopg2:
```bash
pip install psycopg2-binary
cd ~/Documents/Claude/Projects/B2TW\ POS\ App/backend
DATABASE_URL="postgresql://eeshan:UN2wrF1fwk3bVFsJJcVg284AZpPs3Hx6@dpg-d8ad877avr4c73dejlc0-a.oregon-postgres.render.com/bttwpos" \
python3 migrate-sqlite-to-postgres.py
```

### Option C: Using DBeaver or pgAdmin (GUI)

1. Open DBeaver or pgAdmin connected to your Render PostgreSQL database
2. Export from SQLite tables in order:
   - categories
   - products
   - customers
   - staff_users
   - orders
   - order_items
   - bills
   - kot_logs
3. Import CSV/data into corresponding PostgreSQL tables

## Expected Output

```
================================================================================
MIGRATING DATA FROM SQLite TO PostgreSQL
================================================================================

📦 Connecting to databases...
✅ Connected to both databases

🔄 Migrating categories...
✅ Migrated 6 categories
🔄 Migrating products...
✅ Migrated 43 products
🔄 Migrating customers...
✅ Migrated 1204 customers
🔄 Migrating staff users...
✅ Migrated 3 staff users
🔄 Migrating orders...
✅ Migrated 183 orders
🔄 Migrating order items...
✅ Migrated 351 order items
🔄 Migrating bills...
✅ Migrated 186 bills
🔄 Migrating KOT logs...
✅ Migrated 3 KOT logs

================================================================================
✅ MIGRATION COMPLETE
================================================================================

📊 Data Summary:

  ✅ categories       → 6 records migrated
  ✅ products         → 43 records migrated
  ✅ customers        → 1204 records migrated
  ✅ staff_users      → 3 records migrated
  ✅ orders           → 183 records migrated
  ✅ order_items      → 351 records migrated
  ✅ bills            → 186 records migrated
  ✅ kot_logs         → 3 records migrated

✨ All data successfully migrated to PostgreSQL!
```

## Verify Migration

After running the migration, verify the data:

1. **Check record counts in PostgreSQL:**
   ```sql
   SELECT 'categories' as table_name, COUNT(*) FROM categories UNION ALL
   SELECT 'products', COUNT(*) FROM products UNION ALL
   SELECT 'customers', COUNT(*) FROM customers UNION ALL
   SELECT 'staff_users', COUNT(*) FROM staff_users UNION ALL
   SELECT 'orders', COUNT(*) FROM orders UNION ALL
   SELECT 'order_items', COUNT(*) FROM order_items UNION ALL
   SELECT 'bills', COUNT(*) FROM bills UNION ALL
   SELECT 'kot_logs', COUNT(*) FROM kot_logs;
   ```

2. **Test the application:**
   - Go to https://bttwpos.onrender.com
   - Check if historical orders appear in Reports section
   - Verify customer data loaded correctly

## Files Created

- `backend/migrate-sqlite-to-postgres.js` - Node.js migration script
- `backend/migrate-sqlite-to-postgres.py` - Python migration script (alternative)

## Troubleshooting

### Error: "Cannot find package 'sqlite3'"
**Solution:** Install dependencies with `npm install` before running

### Error: "Connection refused"
**Solution:** Ensure your internet connection is working and PostgreSQL URL is correct

### Error: "Duplicate key value violates unique constraint"
**Solution:** This is normal if migration was partially run. Run with clean PostgreSQL (migration script uses ON CONFLICT DO NOTHING to handle this)

### Error: "Foreign key constraint violation"
**Solution:** Ensure migration runs tables in correct order (script handles this automatically)

## Next Steps After Migration

1. ✅ Data migrated to PostgreSQL
2. ⏭️ Push recent changes to GitHub (fixes for Render deployment)
3. ⏭️ Trigger Render redeploy to apply fixes
4. ⏭️ Test login and app functionality
5. ⏭️ Verify historical data appears in reports

---

**Database Credentials** (for reference):
- Host: `dpg-d8ad877avr4c73dejlc0-a.oregon-postgres.render.com`
- Database: `bttwpos`
- Username: `eeshan`
- Port: 5432 (default)
