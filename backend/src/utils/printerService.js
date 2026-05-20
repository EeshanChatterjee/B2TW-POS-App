import SerialPort from 'serialport';
import Printer from 'escpos';

/**
 * Thermal Printer Service
 * Handles ESC/POS protocol for 2" thermal printer communication
 */

class PrinterService {
  constructor(port = '/dev/ttyUSB0', baudRate = 9600) {
    this.port = port;
    this.baudRate = baudRate;
    this.device = null;
    this.printer = null;
  }

  /**
   * Initialize printer connection
   */
  async initialize() {
    try {
      console.log(`🖨️  Initializing printer on ${this.port}...`);

      this.device = new SerialPort(this.port, {
        baudRate: this.baudRate,
        timeout: 5000
      });

      this.printer = new Printer.Usb(this.device);
      this.printer.open();

      console.log('✅ Printer initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Printer initialization failed:', error.message);
      return false;
    }
  }

  /**
   * Print bill with receipt format
   * @param {Object} order - Order object with items
   * @returns {Promise<boolean>}
   */
  async printBill(order) {
    if (!this.printer) {
      console.warn('⚠️  Printer not initialized');
      return false;
    }

    try {
      const p = this.printer;

      // Header
      p.align('ct');
      p.setTextSize(1, 1);
      p.println('BAO TO THE WINGS');
      p.println('Pune, India');
      p.newLine();

      // Order details
      p.setTextSize(0, 0);
      p.println('================================');
      p.align('lt');
      p.println(`Bill #: ${order.bill_number || 'N/A'}`);
      p.println(`Time: ${new Date().toLocaleString()}`);
      p.println('================================');
      p.newLine();

      // Items header
      p.setTextSize(0, 0);
      p.println('Item              Qty   Price');
      p.println('--------------------------------');

      // Items
      let total = 0;
      for (const item of order.items || []) {
        const itemTotal = item.quantity * item.unit_price;
        total += itemTotal;

        const name = item.product_name.substring(0, 13).padEnd(13);
        const qty = String(item.quantity).padStart(3);
        const price = String(itemTotal.toFixed(0)).padStart(5);

        p.println(`${name}${qty}  ${price}`);
      }

      // Total
      p.println('--------------------------------');
      p.align('rt');
      p.setTextSize(1, 1);
      p.println(`Total: ₹${total.toFixed(2)}`);
      p.newLine();

      // Customer section (if available)
      if (order.customer_phone) {
        p.setTextSize(0, 0);
        p.align('ct');
        p.println('Thank you!');
        p.println(`Contact: ${order.customer_phone}`);
      }

      p.newLine();
      p.newLine();
      p.cut();
      p.close();

      console.log('✅ Bill printed successfully');
      return true;
    } catch (error) {
      console.error('❌ Bill printing failed:', error);
      return false;
    }
  }

  /**
   * Print Kitchen Order Ticket (KOT)
   * @param {Object} order - Order object
   * @returns {Promise<boolean>}
   */
  async printKOT(order) {
    if (!this.printer) {
      console.warn('⚠️  Printer not initialized');
      return false;
    }

    try {
      const p = this.printer;

      // Header
      p.align('ct');
      p.setTextSize(1, 1);
      p.println('KITCHEN ORDER');
      p.newLine();

      // Order time
      p.setTextSize(0, 0);
      p.println(`Order Time: ${new Date().toLocaleTimeString()}`);
      p.println('================================');
      p.newLine();

      // Food items only (filter beverages for KOT)
      const foodItems = order.items.filter(item => !item.is_beverage);

      if (foodItems.length === 0) {
        p.align('ct');
        p.println('(Beverages only)');
      } else {
        p.align('lt');
        for (const item of foodItems) {
          p.setTextSize(1, 1);
          p.println(`${item.product_name}`);
          p.setTextSize(0, 0);
          p.println(`Qty: ${item.quantity}`);
          if (item.notes) {
            p.println(`Notes: ${item.notes}`);
          }
          p.newLine();
        }
      }

      p.println('================================');
      p.newLine();
      p.cut();
      p.close();

      console.log('✅ KOT printed successfully');
      return true;
    } catch (error) {
      console.error('❌ KOT printing failed:', error);
      return false;
    }
  }

  /**
   * Test printer connectivity
   */
  async testPrinter() {
    if (!this.printer) {
      return false;
    }

    try {
      const p = this.printer;
      p.align('ct');
      p.println('PRINTER TEST');
      p.println('Bao to the Wings POS');
      p.println('Printer OK');
      p.newLine();
      p.cut();
      p.close();

      console.log('✅ Printer test successful');
      return true;
    } catch (error) {
      console.error('❌ Printer test failed:', error);
      return false;
    }
  }

  /**
   * Close printer connection
   */
  close() {
    if (this.printer) {
      try {
        this.printer.close();
        console.log('🖨️  Printer connection closed');
      } catch (error) {
        console.error('Error closing printer:', error);
      }
    }
  }
}

export default PrinterService;
