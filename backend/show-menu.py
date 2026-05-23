#!/usr/bin/env python3
import sqlite3

db_path = './data/pos.db'

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, name, category, price, is_active
        FROM products
        ORDER BY category, name
    ''')
    products = cursor.fetchall()

    print('\n' + '='*80)
    print('MENU - ALL PRODUCTS')
    print('='*80)
    print(f'{"Name":<40} {"Category":<20} {"Price (₹)":>12} {"Active"}')
    print('-'*80)

    current_category = None
    for product_id, name, category, price, is_active in products:
        if category != current_category:
            if current_category is not None:
                print('-'*80)
            current_category = category

        status = '✓' if is_active else '✗'
        print(f'{name:<40} {category:<20} {price:>12.2f} {status}')

    print('='*80 + '\n')

    conn.close()

except Exception as e:
    print(f'Error: {e}')
