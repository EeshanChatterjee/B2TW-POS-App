#!/bin/bash

# Transaction Price Fix Script for B2TW POS
# This script validates, backs up, fixes, and verifies transaction prices

set -e  # Exit on any error

cd "$(dirname "$0")/backend" || { echo "❌ Failed to navigate to backend directory"; exit 1; }

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        Transaction Price Fix & Validation                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# STEP 1: Validation
echo "📋 STEP 1: Validating Current Transaction Prices..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node src/db/migrations/validate-transaction-prices.js

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Validation failed! Exiting..."
    exit 1
fi

# STEP 2: Database Backup
echo ""
echo "💾 STEP 2: Backing Up Database..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f db/pos.sqlite ]; then
    echo "❌ Database not found at db/pos.sqlite"
    exit 1
fi

BACKUP_FILE="db/pos.sqlite.backup.$(date +%Y%m%d_%H%M%S)"
cp db/pos.sqlite "$BACKUP_FILE"
echo "✅ Database backed up to: $BACKUP_FILE"

# STEP 3: Apply Fixes
echo ""
echo "🔧 STEP 3: Applying Price Fixes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node src/db/migrations/fix-transaction-prices.js

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Fix failed! Restoring from backup..."
    cp "$BACKUP_FILE" db/pos.sqlite
    echo "✅ Database restored"
    exit 1
fi

# STEP 4: Verify Fixes
echo ""
echo "✔️  STEP 4: Verifying Fixes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node src/db/migrations/validate-transaction-prices.js

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║ ✅ Transaction Price Fix Complete!                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Backup location: $BACKUP_FILE"
echo ""
