#!/usr/bin/env python3
import sqlite3

db_path = './data/pos.db'

def round_price(price):
    """Round to nearest rupee for menu display"""
    return round(price)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get all products
    cursor.execute('SELECT id, name, price FROM products WHERE is_active = 1')
    products = cursor.fetchall()

    print('\n' + '='*80)
    print('FIXING PRODUCT PRICES - Converting base prices to total prices (with GST)')
    print('='*80)
    print(f'{"Name":<40} {"Old Price (Base)":>18} {"New Price (Total)":>18}')
    print('-'*80)

    updates = []
    for product_id, name, old_price in products:
        # Convert base price to total price: total = base * 1.05
        new_price = round_price(old_price * 1.05)
        updates.append((new_price, product_id))
        print(f'{name:<40} {old_price:>18.2f} {new_price:>18.2f}')

    print('-'*80)
    print(f'Total products to update: {len(updates)}')
    print('='*80 + '\n')

    # Update all prices
    for new_price, product_id in updates:
        cursor.execute('UPDATE products SET price = ? WHERE id = ?', (new_price, product_id))

    conn.commit()
    print('✓ All prices updated successfully!')
    print('✓ Prices now represent TOTAL price (inclusive of 5% GST)')
    conn.close()

except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
    exit(1)
