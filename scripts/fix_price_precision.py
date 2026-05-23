#!/usr/bin/env python3
import sqlite3
import os
from pathlib import Path

# Database path
db_path = Path(__file__).parent.parent / 'data' / 'pos.db'

print('🔧 Starting price precision fix for existing data...\n')

try:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all order_items
    print('📊 Fetching order_items data...')
    cursor.execute('SELECT * FROM order_items')
    order_items = cursor.fetchall()
    print(f'   Found {len(order_items)} order items\n')

    # Fix each order_item
    print('🔄 Fixing order_items precision...')
    items_fixed = 0
    items_changed = 0

    for item in order_items:
        # Apply cents-based rounding
        item_cents = round(item['quantity'] * item['unit_price'] * 100)
        corrected_total = item_cents / 100

        # Only update if value changed
        if abs(corrected_total - item['total_price']) > 0.001:
            cursor.execute(
                'UPDATE order_items SET total_price = ? WHERE id = ?',
                (corrected_total, item['id'])
            )
            items_changed += 1
        items_fixed += 1

    conn.commit()
    print(f'   ✅ {items_fixed} order items processed')
    print(f'   🔨 {items_changed} order items corrected\n')

    # Get all orders
    print('📊 Fetching orders data...')
    cursor.execute('SELECT * FROM orders')
    orders = cursor.fetchall()
    print(f'   Found {len(orders)} orders\n')

    # Fix each order total_amount
    print('🔄 Fixing orders total_amount...')
    orders_fixed = 0
    orders_changed = 0

    for order in orders:
        # Calculate sum of all order_items for this order
        cursor.execute(
            'SELECT SUM(total_price) as total FROM order_items WHERE order_id = ?',
            (order['id'],)
        )
        items_result = cursor.fetchone()
        calculated_total = items_result['total'] or 0

        # Apply final rounding
        corrected_total = round(calculated_total * 100) / 100

        # Only update if value changed
        if abs(corrected_total - order['total_amount']) > 0.001:
            cursor.execute(
                'UPDATE orders SET total_amount = ? WHERE id = ?',
                (corrected_total, order['id'])
            )
            orders_changed += 1
        orders_fixed += 1

    conn.commit()
    print(f'   ✅ {orders_fixed} orders processed')
    print(f'   🔨 {orders_changed} orders corrected\n')

    # Verify fixes
    print('✓ Verification Report:')

    cursor.execute('SELECT COUNT(*) as cnt FROM order_items')
    total_items = cursor.fetchone()['cnt']

    cursor.execute('SELECT COUNT(DISTINCT order_id) as cnt FROM order_items')
    orders_with_items = cursor.fetchone()['cnt']

    cursor.execute('SELECT COUNT(*) as cnt FROM orders')
    total_orders = cursor.fetchone()['cnt']

    # Check for precision errors
    cursor.execute('SELECT * FROM order_items')
    precision_errors = 0
    for item in cursor.fetchall():
        expected = round(item['quantity'] * item['unit_price'] * 100) / 100
        if abs(item['total_price'] - expected) > 0.001:
            precision_errors += 1

    print(f'   • Total order items: {total_items}')
    print(f'   • Precision errors remaining: {precision_errors}')
    print(f'   • Orders with items: {orders_with_items}')
    print(f'   • Total orders: {total_orders}\n')

    # Sample output
    print('📋 Sample corrected items:')
    cursor.execute('SELECT id, quantity, unit_price, total_price FROM order_items LIMIT 5')
    samples = cursor.fetchall()

    for sample in samples:
        expected = round(sample['quantity'] * sample['unit_price'] * 100) / 100
        is_match = abs(sample['total_price'] - expected) < 0.001
        print(f'   ID: {sample["id"]}')
        print(f"      Qty: {sample['quantity']}, Unit: {sample['unit_price']}, Total: {sample['total_price']}")
        print(f'      ✓ Matches expected: {is_match}\n')

    print('✅ Price precision fix completed successfully!')
    conn.close()

except Exception as e:
    print(f'❌ Error during price precision fix: {str(e)}')
    import traceback
    traceback.print_exc()
    exit(1)
