# B2TW POS System - Project Tasks

## Active

### Phase 1: Project Setup & Architecture ✅ COMPLETE
- [x] **Define tech stack and project structure** - React + Node.js + SQLite, setup git repo
  - [x] Node backend with Express
  - [x] React frontend with TypeScript
  - [x] SQLite for local persistence
  - [x] ESC/POS for thermal printer integration
- [x] **Set up development environment** - Node, npm, database tools configured
- [x] **Create database schema** - design for products, orders, customers, bills
- [x] **Initialize project repositories** - backend and frontend starter templates

### Phase 2: Teller Screen (MVP)
- [ ] **Build product catalog interface** - grid/list of menu items + beverages
  - Quick-add to bill functionality
  - Quantity adjustment
  - Category filtering (Food, Beverages, etc.)
- [ ] **Build shopping cart/bill UI** - show selected items, quantities, running total
- [ ] **Implement payment flow** - cash/card/UPI options, final amount
- [ ] **Create bill generator module** - format bill data for printing

### Phase 3: Thermal Printer Integration
- [ ] **Research & test ESC/POS protocol** - 2" printer compatibility
- [ ] **Implement bill printing** - print customer bill (2" thermal)
- [ ] **Implement KOT printing** - kitchen order ticket
- [ ] **Test printer connectivity** - Bluetooth pairing workflow

### Phase 4: CRM Module
- [ ] **Design customer database schema** - phone, name, order history, preferences
- [ ] **Build customer capture form** - integrated into checkout
- [ ] **Implement customer lookup** - quick search by phone/name
- [ ] **Track customer history** - order history and preferences

### Phase 5: Admin Panel
- [ ] **Build menu management screen** - add/edit/delete products, pricing
- [ ] **Build sales reporting dashboard** - daily sales, top items, revenue
- [ ] **Build bill history & editing** - view past bills, cancellations, adjustments
- [ ] **Build customer analytics** - repeat customers, spending trends
- [ ] **Implement admin authentication** - basic login/password

### Phase 6: Testing & Deployment
- [ ] **End-to-end testing** - full workflow from order to bill to print
- [ ] **Performance testing** - offline functionality, data sync
- [ ] **Setup deployment** - package app for food truck hardware
- [ ] **Staff training & documentation**

## Waiting On

- Clarification on payment methods (cash only, card readers, UPI integration needed?)
- Menu items list for initial database seeding
- Hardware specification (tablet vs iPad vs dedicated touchscreen PC?)
- Printer model confirmation (make/model for driver compatibility testing)

## Someday

- Online ordering integration
- Multi-location support
- Cloud backup & sync
- Loyalty program features
- Inventory management
- Staff management & shift tracking
- Advanced analytics & AI recommendations

## Done

