#!/usr/bin/env python3
import sqlite3
import os

db_path = './data/pos.db'

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print('Deleting all data from order_items...')
    cursor.execute('DELETE FROM order_items')

    print('Deleting all data from orders...')
    cursor.execute('DELETE FROM orders')

    conn.commit()
    conn.close()

    print('✓ All data cleared successfully')
except Exception as e:
    print(f'Error clearing data: {e}')
    exit(1)
