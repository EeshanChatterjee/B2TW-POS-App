-- Import sales data for May 2026
-- This script creates orders and order items from the extracted sales data

-- Ensure categories exist
INSERT OR IGNORE INTO categories (id, name, position, created_at) VALUES
('cat_drinks', 'Drinks', 1, datetime('now')),
('cat_main', 'Main Course', 2, datetime('now')),
('cat_appetizers', 'Appetizers', 3, datetime('now'));

-- Ensure products exist
INSERT OR IGNORE INTO products (id, name, category, price, veg_type, is_active, is_beverage, created_at) VALUES
('prod_water', 'Water', 'cat_drinks', 10, 'not_applicable', 1, 1, datetime('now')),
('prod_coke', 'Coke', 'cat_drinks', 20, 'not_applicable', 1, 1, datetime('now')),
('prod_sabe_bao', 'Sabe Bao', 'cat_main', 150, 'non_veg', 1, 0, datetime('now')),
('prod_biracas', 'Biracas', 'cat_main', 160, 'non_veg', 1, 0, datetime('now')),
('prod_pepper_wedges', 'Pepper Wedges', 'cat_appetizers', 135, 'veg', 1, 0, datetime('now')),
('prod_cheese_wings', 'Cheese Wings', 'cat_appetizers', 150, 'veg', 1, 0, datetime('now')),
('prod_chicken', 'Chicken', 'cat_main', 150, 'non_veg', 1, 0, datetime('now')),
('prod_jeera_masaley', 'Jeera Masaley', 'cat_main', 20, 'veg', 1, 0, datetime('now'));

-- Import May 19 sales
-- Order ID: order_20260519 with total ₹3400
INSERT INTO orders (id, total_amount, status, payment_method, created_at, notes)
VALUES ('order_20260519', 3400, 'completed', 'cash', '2026-05-19 18:00:00',
'Daily sales summary for May 19. Cash: 2300, UPI: 2930, Card: 320');

-- Order items for May 19
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, created_at) VALUES
('item_20260519_1', 'order_20260519', 'prod_biracas', 2, 160, 320, '2026-05-19 18:00:00'),
('item_20260519_2', 'order_20260519', 'prod_pepper_wedges', 1, 135, 135, '2026-05-19 18:00:00'),
('item_20260519_3', 'order_20260519', 'prod_cheese_wings', 1, 150, 150, '2026-05-19 18:00:00'),
('item_20260519_4', 'order_20260519', 'prod_sabe_bao', 2, 150, 300, '2026-05-19 18:00:00'),
('item_20260519_5', 'order_20260519', 'prod_coke', 3, 20, 60, '2026-05-19 18:00:00'),
('item_20260519_6', 'order_20260519', 'prod_water', 10, 10, 100, '2026-05-19 18:00:00'),
('item_20260519_7', 'order_20260519', 'prod_chicken', 2, 150, 300, '2026-05-19 18:00:00'),
('item_20260519_8', 'order_20260519', 'prod_jeera_masaley', 1, 20, 20, '2026-05-19 18:00:00');

-- Additional sample orders for testing reports (May 3, 5, 10, 15)
INSERT INTO orders (id, total_amount, status, payment_method, created_at, notes)
VALUES
('order_20260503', 2850, 'completed', 'upi', '2026-05-03 18:00:00', 'Sample order for May 3'),
('order_20260505', 3200, 'completed', 'card', '2026-05-05 18:00:00', 'Sample order for May 5'),
('order_20260510', 2950, 'completed', 'cash', '2026-05-10 18:00:00', 'Sample order for May 10'),
('order_20260515', 3100, 'completed', 'upi', '2026-05-15 18:00:00', 'Sample order for May 15');

-- Order items for sample orders
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, created_at) VALUES
('item_20260503_1', 'order_20260503', 'prod_biracas', 1, 160, 160, '2026-05-03 18:00:00'),
('item_20260503_2', 'order_20260503', 'prod_sabe_bao', 1, 150, 150, '2026-05-03 18:00:00'),
('item_20260503_3', 'order_20260503', 'prod_cheese_wings', 2, 150, 300, '2026-05-03 18:00:00'),
('item_20260503_4', 'order_20260503', 'prod_water', 15, 10, 150, '2026-05-03 18:00:00'),
('item_20260503_5', 'order_20260503', 'prod_coke', 2, 20, 40, '2026-05-03 18:00:00'),
('item_20260503_6', 'order_20260503', 'prod_pepper_wedges', 1, 135, 135, '2026-05-03 18:00:00'),
('item_20260503_7', 'order_20260503', 'prod_jeera_masaley', 2, 20, 40, '2026-05-03 18:00:00'),
('item_20260503_8', 'order_20260503', 'prod_chicken', 1, 150, 150, '2026-05-03 18:00:00'),
('item_20260503_9', 'order_20260503', 'prod_water', 10, 10, 100, '2026-05-03 18:00:00'),
('item_20260503_10', 'order_20260503', 'prod_sabe_bao', 1, 150, 150, '2026-05-03 18:00:00'),
('item_20260503_11', 'order_20260503', 'prod_coke', 1, 20, 20, '2026-05-03 18:00:00'),
('item_20260503_12', 'order_20260503', 'prod_biracas', 1, 160, 160, '2026-05-03 18:00:00'),
('item_20260505_1', 'order_20260505', 'prod_pepper_wedges', 2, 135, 270, '2026-05-05 18:00:00'),
('item_20260505_2', 'order_20260505', 'prod_biracas', 2, 160, 320, '2026-05-05 18:00:00'),
('item_20260505_3', 'order_20260505', 'prod_sabe_bao', 2, 150, 300, '2026-05-05 18:00:00'),
('item_20260505_4', 'order_20260505', 'prod_cheese_wings', 1, 150, 150, '2026-05-05 18:00:00'),
('item_20260505_5', 'order_20260505', 'prod_chicken', 1, 150, 150, '2026-05-05 18:00:00'),
('item_20260505_6', 'order_20260505', 'prod_coke', 2, 20, 40, '2026-05-05 18:00:00'),
('item_20260505_7', 'order_20260505', 'prod_water', 12, 10, 120, '2026-05-05 18:00:00'),
('item_20260505_8', 'order_20260505', 'prod_jeera_masaley', 2, 20, 40, '2026-05-05 18:00:00'),
('item_20260505_9', 'order_20260505', 'prod_sabe_bao', 1, 150, 150, '2026-05-05 18:00:00'),
('item_20260505_10', 'order_20260505', 'prod_pepper_wedges', 1, 135, 135, '2026-05-05 18:00:00'),
('item_20260505_11', 'order_20260505', 'prod_coke', 1, 20, 20, '2026-05-05 18:00:00'),
('item_20260505_12', 'order_20260505', 'prod_water', 5, 10, 50, '2026-05-05 18:00:00'),
('item_20260510_1', 'order_20260510', 'prod_biracas', 3, 160, 480, '2026-05-10 18:00:00'),
('item_20260510_2', 'order_20260510', 'prod_cheese_wings', 2, 150, 300, '2026-05-10 18:00:00'),
('item_20260510_3', 'order_20260510', 'prod_water', 8, 10, 80, '2026-05-10 18:00:00'),
('item_20260510_4', 'order_20260510', 'prod_chicken', 1, 150, 150, '2026-05-10 18:00:00'),
('item_20260510_5', 'order_20260510', 'prod_coke', 2, 20, 40, '2026-05-10 18:00:00'),
('item_20260510_6', 'order_20260510', 'prod_sabe_bao', 1, 150, 150, '2026-05-10 18:00:00'),
('item_20260510_7', 'order_20260510', 'prod_pepper_wedges', 2, 135, 270, '2026-05-10 18:00:00'),
('item_20260510_8', 'order_20260510', 'prod_jeera_masaley', 1, 20, 20, '2026-05-10 18:00:00'),
('item_20260510_9', 'order_20260510', 'prod_water', 5, 10, 50, '2026-05-10 18:00:00'),
('item_20260510_10', 'order_20260510', 'prod_biracas', 1, 160, 160, '2026-05-10 18:00:00'),
('item_20260510_11', 'order_20260510', 'prod_coke', 1, 20, 20, '2026-05-10 18:00:00'),
('item_20260510_12', 'order_20260510', 'prod_cheese_wings', 1, 150, 150, '2026-05-10 18:00:00'),
('item_20260515_1', 'order_20260515', 'prod_sabe_bao', 2, 150, 300, '2026-05-15 18:00:00'),
('item_20260515_2', 'order_20260515', 'prod_pepper_wedges', 1, 135, 135, '2026-05-15 18:00:00'),
('item_20260515_3', 'order_20260515', 'prod_coke', 3, 20, 60, '2026-05-15 18:00:00'),
('item_20260515_4', 'order_20260515', 'prod_water', 10, 10, 100, '2026-05-15 18:00:00'),
('item_20260515_5', 'order_20260515', 'prod_biracas', 1, 160, 160, '2026-05-15 18:00:00'),
('item_20260515_6', 'order_20260515', 'prod_cheese_wings', 1, 150, 150, '2026-05-15 18:00:00'),
('item_20260515_7', 'order_20260515', 'prod_chicken', 1, 150, 150, '2026-05-15 18:00:00'),
('item_20260515_8', 'order_20260515', 'prod_jeera_masaley', 1, 20, 20, '2026-05-15 18:00:00'),
('item_20260515_9', 'order_20260515', 'prod_water', 5, 10, 50, '2026-05-15 18:00:00'),
('item_20260515_10', 'order_20260515', 'prod_sabe_bao', 1, 150, 150, '2026-05-15 18:00:00'),
('item_20260515_11', 'order_20260515', 'prod_coke', 1, 20, 20, '2026-05-15 18:00:00'),
('item_20260515_12', 'order_20260515', 'prod_pepper_wedges', 1, 135, 135, '2026-05-15 18:00:00');
