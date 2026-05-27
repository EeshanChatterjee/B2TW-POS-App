import express from 'express';
import { getDatabase } from '../db/connection.js';
import {
  roundCurrency,
  calculateBasePrice,
  calculateGSTAmount,
  getPriceBreakdown,
  sumTotalPrices,
  averageTotalPrices
} from '../utils/priceCalculations.js';

const router = express.Router();

/**
 * GET /api/reports/sales
 * Get sales data for a date range
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/sales', async (req, res) => {
  try {
    const db = await getDatabase();
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.sendError('startDate and endDate are required', 400);
    }

    // Get all orders in date range
    const ordersResult = await db.query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as avg_order_value,
        payment_method
      FROM orders
      WHERE DATE(created_at) BETWEEN $1 AND $2
      GROUP BY DATE(created_at), payment_method
      ORDER BY date DESC`,
      [startDate, endDate]
    );
    const orders = ordersResult.rows;

    // Aggregate by date
    const salesByDate = {};
    orders.forEach(order => {
      if (!salesByDate[order.date]) {
        salesByDate[order.date] = {
          date: order.date,
          orders: 0,
          total_price: 0,
          average_price: 0,
          breakdown: {}
        };
      }
      // Ensure numeric values from PostgreSQL are actual numbers
      const orderCount = typeof order.order_count === 'string' ? parseInt(order.order_count) : (order.order_count || 0);
      const totalSales = typeof order.total_sales === 'string' ? parseFloat(order.total_sales) : (order.total_sales || 0);

      salesByDate[order.date].orders += orderCount;
      salesByDate[order.date].total_price = sumTotalPrices([salesByDate[order.date].total_price, totalSales]);
      salesByDate[order.date].breakdown[order.payment_method || 'cash'] = totalSales;
    });

    // Calculate averages and add price breakdowns
    Object.keys(salesByDate).forEach(date => {
      const data = salesByDate[date];
      data.average_price = data.orders > 0 ? roundCurrency(data.total_price / data.orders) : 0;

      // Calculate base price and GST on-the-fly
      const totalBreakdown = getPriceBreakdown(data.total_price);
      const avgBreakdown = getPriceBreakdown(data.average_price);

      data.base_price = totalBreakdown.base_price;
      data.gst_amount = totalBreakdown.gst_amount;
      data.average_base_price = avgBreakdown.base_price;
      data.average_gst_amount = avgBreakdown.gst_amount;
    });

    const salesData = Object.values(salesByDate);
    const totalPrices = salesData.map(d => d.total_price);
    const totalSalesSum = sumTotalPrices(totalPrices);
    const totalOrders = salesData.reduce((sum, d) => sum + d.orders, 0);
    const averageOrderValue = totalOrders > 0 ? roundCurrency(totalSalesSum / totalOrders) : 0;
    const summaryBreakdown = getPriceBreakdown(totalSalesSum);

    res.sendSuccess({
      startDate,
      endDate,
      data: salesData,
      summary: {
        total_price: totalSalesSum,
        base_price: summaryBreakdown.base_price,
        gst_amount: summaryBreakdown.gst_amount,
        totalOrders: totalOrders,
        averageOrderValue: averageOrderValue
      }
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.sendError('Failed to fetch sales report', 500, error.message);
  }
});

/**
 * GET /api/reports/top-products
 * Get top selling products
 * Query params: limit (default 10), startDate, endDate
 */
router.get('/top-products', async (req, res) => {
  try {
    const db = await getDatabase();
    const { limit = 10, startDate, endDate } = req.query;

    let query = `SELECT
      p.id,
      p.name,
      p.category,
      COALESCE(SUM(oi.quantity), 0) as total_quantity,
      COALESCE(SUM(oi.total_price), 0) as total_revenue,
      COUNT(DISTINCT oi.order_id) as order_count,
      COALESCE(AVG(oi.quantity), 0) as avg_quantity
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id`;

    const params = [];

    if (startDate && endDate) {
      query += ` WHERE DATE(o.created_at) BETWEEN $1 AND $2`;
      params.push(startDate, endDate);
    }

    query += ` GROUP BY p.id, p.name, p.category
      ORDER BY total_revenue DESC
      LIMIT $` + (params.length + 1);
    params.push(parseInt(limit));

    const topProductsResult = await db.query(query, params);
    const topProducts = topProductsResult.rows;

    // Format products with price breakdowns calculated on-the-fly
    const productsWithBreakdown = topProducts.map(p => {
      // Ensure numeric values from PostgreSQL are actual numbers
      const revenue = typeof p.total_revenue === 'string' ? parseFloat(p.total_revenue) : (p.total_revenue || 0);
      const quantity = typeof p.total_quantity === 'string' ? parseFloat(p.total_quantity) : (p.total_quantity || 0);
      const orderCount = typeof p.order_count === 'string' ? parseInt(p.order_count) : (p.order_count || 0);
      const avgQty = typeof p.avg_quantity === 'string' ? parseFloat(p.avg_quantity) : (p.avg_quantity || 0);

      const totalPrice = roundCurrency(revenue);
      const breakdown = getPriceBreakdown(totalPrice);
      return {
        ...p,
        total_quantity: quantity,
        order_count: orderCount,
        avg_quantity: avgQty,
        total_revenue: totalPrice,
        total_price: totalPrice,
        base_price: breakdown.base_price,
        gst_amount: breakdown.gst_amount
      };
    });

    const totalPrices = productsWithBreakdown.map(p => p.total_price);
    const totalRevenue = sumTotalPrices(totalPrices);
    const revenueBreakdown = getPriceBreakdown(totalRevenue);
    const totalProductsSold = productsWithBreakdown.reduce((sum, p) => sum + p.total_quantity, 0);

    res.sendSuccess({
      limit: parseInt(limit),
      startDate,
      endDate,
      data: productsWithBreakdown,
      summary: {
        totalProductsSold: totalProductsSold,
        total_price: totalRevenue,
        base_price: revenueBreakdown.base_price,
        gst_amount: revenueBreakdown.gst_amount,
        uniqueProducts: topProducts.length
      }
    });
  } catch (error) {
    console.error('Top products report error:', error);
    res.sendError('Failed to fetch top products report', 500, error.message);
  }
});

/**
 * GET /api/reports/customers
 * Get customer metrics and analytics
 * Query params: startDate, endDate
 */
router.get('/customers', async (req, res) => {
  try {
    const db = await getDatabase();
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE DATE(o.created_at) BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    // Get customer stats
    const customerStatsResult = await db.query(
      `SELECT
        c.id,
        c.name,
        c.phone,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        COALESCE(AVG(o.total_amount), 0) as avg_order_value,
        MAX(o.created_at) as last_order,
        MIN(o.created_at) as first_order
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id ${dateFilter}
      GROUP BY c.id
      HAVING COUNT(o.id) > 0
      ORDER BY total_spent DESC`,
      params
    );
    // Convert numeric values from PostgreSQL
    const customerStats = customerStatsResult.rows.map(stat => ({
      ...stat,
      order_count: typeof stat.order_count === 'string' ? parseInt(stat.order_count) : (stat.order_count || 0),
      total_spent: typeof stat.total_spent === 'string' ? parseFloat(stat.total_spent) : (stat.total_spent || 0),
      avg_order_value: typeof stat.avg_order_value === 'string' ? parseFloat(stat.avg_order_value) : (stat.avg_order_value || 0)
    }));

    // Overall metrics
    const metricsResult = await db.query(
      `SELECT
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(DISTINCT CASE WHEN DATE(o.created_at) BETWEEN $1 AND $2 THEN c.id END) as active_customers,
        COUNT(DISTINCT CASE WHEN (SELECT COUNT(*) FROM orders o2 WHERE o2.customer_id = c.id) = 1 THEN c.id END) as new_customers,
        AVG(CASE WHEN DATE(o.created_at) BETWEEN $1 AND $2 THEN o.total_amount END) as avg_customer_spend
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id`,
      [startDate, endDate, startDate, endDate]
    );
    const metricsRow = metricsResult.rows[0];

    // Convert numeric values in metrics
    const metrics = metricsRow ? {
      total_customers: typeof metricsRow.total_customers === 'string' ? parseInt(metricsRow.total_customers) : (metricsRow.total_customers || 0),
      active_customers: typeof metricsRow.active_customers === 'string' ? parseInt(metricsRow.active_customers) : (metricsRow.active_customers || 0),
      new_customers: typeof metricsRow.new_customers === 'string' ? parseInt(metricsRow.new_customers) : (metricsRow.new_customers || 0),
      avg_customer_spend: typeof metricsRow.avg_customer_spend === 'string' ? parseFloat(metricsRow.avg_customer_spend) : (metricsRow.avg_customer_spend || 0)
    } : {};

    res.sendSuccess({
      startDate,
      endDate,
      metrics,
      topCustomers: customerStats.slice(0, 20),
      data: customerStats
    });
  } catch (error) {
    console.error('Customer metrics error:', error);
    res.sendError('Failed to fetch customer metrics', 500, error.message);
  }
});

/**
 * GET /api/reports/revenue
 * Get revenue breakdown by date and payment method
 * Query params: startDate, endDate, groupBy (day|week|month)
 */
router.get('/revenue', async (req, res) => {
  try {
    const db = await getDatabase();
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      return res.sendError('startDate and endDate are required', 400);
    }

    let dateGrouping;
    switch (groupBy) {
      case 'week':
        dateGrouping = "DATE(created_at - INTERVAL '1 day' * EXTRACT(DOW FROM created_at))";
        break;
      case 'month':
        dateGrouping = "DATE(created_at - INTERVAL '1 day' * (EXTRACT(DAY FROM created_at) - 1))";
        break;
      default:
        dateGrouping = "DATE(created_at)";
    }

    const revenueResult = await db.query(
      `SELECT
        ${dateGrouping} as period,
        payment_method,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_amount
      FROM orders
      WHERE DATE(created_at) BETWEEN $1 AND $2
      GROUP BY ${dateGrouping}, payment_method
      ORDER BY period DESC`,
      [startDate, endDate]
    );
    const revenue = revenueResult.rows;

    // Aggregate by period
    const revenueByPeriod = {};
    revenue.forEach(row => {
      if (!revenueByPeriod[row.period]) {
        revenueByPeriod[row.period] = {
          period: row.period,
          total: 0,
          orders: 0,
          breakdown: {}
        };
      }
      // Convert numeric values from PostgreSQL
      const orderCount = typeof row.order_count === 'string' ? parseInt(row.order_count) : (row.order_count || 0);
      const totalAmount = typeof row.total_amount === 'string' ? parseFloat(row.total_amount) : (row.total_amount || 0);

      revenueByPeriod[row.period].total = roundCurrency(revenueByPeriod[row.period].total + totalAmount);
      revenueByPeriod[row.period].orders += orderCount;
      revenueByPeriod[row.period].breakdown[row.payment_method || 'cash'] = totalAmount;
    });

    const revenueData = Object.values(revenueByPeriod);
    const totalRevenueSum = roundCurrency(revenueData.reduce((sum, p) => sum + p.total, 0));

    res.sendSuccess({
      startDate,
      endDate,
      groupBy,
      data: revenueData,
      summary: {
        totalRevenue: totalRevenueSum,
        totalOrders: revenueData.reduce((sum, p) => sum + p.orders, 0),
        periods: Object.keys(revenueByPeriod).length
      }
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.sendError('Failed to fetch revenue report', 500, error.message);
  }
});

/**
 * GET /api/reports/dashboard
 * Get dashboard overview with key metrics
 */
router.get('/dashboard', async (req, res) => {
  try {
    const db = await getDatabase();

    // Compute dates server-side for sql.js compatibility
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Get today's sales
    const todaySalesResult = await db.query(
      `SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(AVG(total_amount), 0) as avg_order_value
      FROM orders
      WHERE DATE(created_at) = $1`,
      [today]
    );
    const todaySalesRow = todaySalesResult.rows[0];
    // Convert numeric values from PostgreSQL
    const todaySales = todaySalesRow ? {
      order_count: typeof todaySalesRow.order_count === 'string' ? parseInt(todaySalesRow.order_count) : (todaySalesRow.order_count || 0),
      total_sales: typeof todaySalesRow.total_sales === 'string' ? parseFloat(todaySalesRow.total_sales) : (todaySalesRow.total_sales || 0),
      avg_order_value: typeof todaySalesRow.avg_order_value === 'string' ? parseFloat(todaySalesRow.avg_order_value) : (todaySalesRow.avg_order_value || 0)
    } : { order_count: 0, total_sales: 0, avg_order_value: 0 };

    // Get this month's sales
    const monthSalesResult = await db.query(
      `SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_sales
      FROM orders
      WHERE DATE(created_at) BETWEEN $1 AND $2`,
      [monthStart, today]
    );
    const monthSalesRow = monthSalesResult.rows[0];
    // Convert numeric values from PostgreSQL
    const monthSales = monthSalesRow ? {
      order_count: typeof monthSalesRow.order_count === 'string' ? parseInt(monthSalesRow.order_count) : (monthSalesRow.order_count || 0),
      total_sales: typeof monthSalesRow.total_sales === 'string' ? parseFloat(monthSalesRow.total_sales) : (monthSalesRow.total_sales || 0)
    } : { order_count: 0, total_sales: 0 };

    // Top product today
    const topProductTodayResult = await db.query(
      `SELECT
        p.name,
        SUM(oi.quantity) as quantity,
        COALESCE(SUM(oi.total_price), 0) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE DATE(o.created_at) = $1
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT 1`,
      [today]
    );
    const topProductTodayRow = topProductTodayResult.rows[0];
    // Convert numeric values from PostgreSQL
    const topProductToday = topProductTodayRow ? {
      name: topProductTodayRow.name,
      quantity: typeof topProductTodayRow.quantity === 'string' ? parseFloat(topProductTodayRow.quantity) : (topProductTodayRow.quantity || 0),
      revenue: typeof topProductTodayRow.revenue === 'string' ? parseFloat(topProductTodayRow.revenue) : (topProductTodayRow.revenue || 0)
    } : null;

    // Total customers today - distinct customers who ordered today
    const totalCustomersTodayResult = await db.query(
      `SELECT COUNT(DISTINCT customer_id) as count
       FROM orders
       WHERE DATE(created_at) = $1 AND customer_id IS NOT NULL AND customer_id != ''`,
      [today]
    );
    const totalCustomersTodayRow = totalCustomersTodayResult.rows[0];
    const totalCustomersToday = totalCustomersTodayRow ? {
      count: typeof totalCustomersTodayRow.count === 'string' ? parseInt(totalCustomersTodayRow.count) : (totalCustomersTodayRow.count || 0)
    } : { count: 0 };

    // New customers today - customers whose first order was today
    const newCustomersTodayResult = await db.query(
      `SELECT COUNT(DISTINCT customer_id) as count
       FROM orders
       WHERE DATE(created_at) = $1
       AND customer_id IS NOT NULL
       AND customer_id != ''
       AND customer_id NOT IN (
         SELECT DISTINCT customer_id
         FROM orders
         WHERE DATE(created_at) < $1 AND customer_id IS NOT NULL AND customer_id != ''
       )`,
      [today]
    );
    const newCustomersTodayRow = newCustomersTodayResult.rows[0];
    const newCustomersToday = newCustomersTodayRow ? {
      count: typeof newCustomersTodayRow.count === 'string' ? parseInt(newCustomersTodayRow.count) : (newCustomersTodayRow.count || 0)
    } : { count: 0 };

    const todayTotal = roundCurrency(todaySales?.total_sales || 0);
    const todayAvg = roundCurrency(todaySales?.avg_order_value || 0);
    const monthTotal = roundCurrency(monthSales?.total_sales || 0);
    const productRevenue = roundCurrency(topProductToday?.revenue || 0);

    const todayBreakdown = getPriceBreakdown(todayTotal);
    const todayAvgBreakdown = getPriceBreakdown(todayAvg);
    const monthBreakdown = getPriceBreakdown(monthTotal);
    const productBreakdown = getPriceBreakdown(productRevenue);

    res.sendSuccess({
      today: {
        order_count: todaySales.order_count,
        total_price: todayTotal,
        base_price: todayBreakdown.base_price,
        gst_amount: todayBreakdown.gst_amount,
        avg_order_value: todayAvg,
        avg_base_price: todayAvgBreakdown.base_price,
        avg_gst_amount: todayAvgBreakdown.gst_amount
      },
      thisMonth: {
        order_count: monthSales.order_count,
        total_price: monthTotal,
        base_price: monthBreakdown.base_price,
        gst_amount: monthBreakdown.gst_amount
      },
      topProduct: topProductToday ? {
        name: topProductToday.name,
        quantity: topProductToday.quantity,
        total_price: productRevenue,
        base_price: productBreakdown.base_price,
        gst_amount: productBreakdown.gst_amount
      } : {},
      customers: {
        total_customers_today: totalCustomersToday.count,
        new_customers_today: newCustomersToday.count
      }
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.sendError('Failed to fetch dashboard metrics', 500, error.message);
  }
});

/**
 * GET /api/reports/comparison/today-vs-lastweek
 * Compare today with same day last week
 */
router.get('/comparison/today-vs-lastweek', async (req, res) => {
  try {
    const db = await getDatabase();

    // Compute dates server-side for sql.js compatibility
    const today = new Date().toISOString().split('T')[0];
    const lastWeekDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todayDataResult = await db.query(
      `SELECT
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(AVG(total_amount), 0) as avg_order
      FROM orders
      WHERE DATE(created_at) = $1`,
      [today]
    );
    const todayData = todayDataResult.rows[0];

    const lastWeekDataResult = await db.query(
      `SELECT
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(AVG(total_amount), 0) as avg_order
      FROM orders
      WHERE DATE(created_at) = $1`,
      [lastWeekDate]
    );
    const lastWeekData = lastWeekDataResult.rows[0];

    const currentTotal = roundCurrency(todayData?.total_sales || 0);
    const currentAvg = roundCurrency(todayData?.avg_order || 0);
    const lastWeekTotal = roundCurrency(lastWeekData?.total_sales || 0);
    const lastWeekAvg = roundCurrency(lastWeekData?.avg_order || 0);

    const currentTotalBreakdown = getPriceBreakdown(currentTotal);
    const currentAvgBreakdown = getPriceBreakdown(currentAvg);
    const lastWeekTotalBreakdown = getPriceBreakdown(lastWeekTotal);
    const lastWeekAvgBreakdown = getPriceBreakdown(lastWeekAvg);

    const current = {
      orders: todayData?.orders || 0,
      total_price: currentTotal,
      base_price: currentTotalBreakdown.base_price,
      gst_amount: currentTotalBreakdown.gst_amount,
      avg_order: currentAvg,
      avg_base_price: currentAvgBreakdown.base_price,
      avg_gst_amount: currentAvgBreakdown.gst_amount
    };
    const lastWeek = {
      orders: lastWeekData?.orders || 0,
      total_price: lastWeekTotal,
      base_price: lastWeekTotalBreakdown.base_price,
      gst_amount: lastWeekTotalBreakdown.gst_amount,
      avg_order: lastWeekAvg,
      avg_base_price: lastWeekAvgBreakdown.base_price,
      avg_gst_amount: lastWeekAvgBreakdown.gst_amount
    };

    const growth = {
      orders_pct: lastWeek.orders > 0 ? ((current.orders - lastWeek.orders) / lastWeek.orders * 100).toFixed(2) : 0,
      sales_pct: lastWeek.total_sales > 0 ? ((current.total_sales - lastWeek.total_sales) / lastWeek.total_sales * 100).toFixed(2) : 0
    };

    res.sendSuccess({
      today: current,
      last_week_same_day: lastWeek,
      growth: growth
    });
  } catch (error) {
    console.error('Today vs Last Week comparison error:', error);
    res.sendError('Failed to fetch comparison', 500, error.message);
  }
});

/**
 * GET /api/reports/comparison/day-of-week
 * Sales by day of week
 * Query params: startDate, endDate
 */
router.get('/comparison/day-of-week', async (req, res) => {
  try {
    const db = await getDatabase();
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.sendError('startDate and endDate are required', 400);
    }

    const dayOfWeekDataResult = await db.query(
      `SELECT
        CASE EXTRACT(DOW FROM created_at)::integer
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day_of_week,
        COUNT(*) as orders,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as avg_order
      FROM orders
      WHERE DATE(created_at) BETWEEN $1 AND $2
      GROUP BY EXTRACT(DOW FROM created_at)::integer
      ORDER BY EXTRACT(DOW FROM created_at)::integer`,
      [startDate, endDate]
    );
    const dayOfWeekData = dayOfWeekDataResult.rows;

    // Format with price breakdowns calculated on-the-fly
    const formattedData = dayOfWeekData.map(d => {
      const totalPrice = roundCurrency(d.total_sales);
      const avgPrice = roundCurrency(d.avg_order);
      const totalBreakdown = getPriceBreakdown(totalPrice);
      const avgBreakdown = getPriceBreakdown(avgPrice);

      return {
        ...d,
        total_price: totalPrice,
        base_price: totalBreakdown.base_price,
        gst_amount: totalBreakdown.gst_amount,
        avg_order: avgPrice,
        avg_base_price: avgBreakdown.base_price,
        avg_gst_amount: avgBreakdown.gst_amount
      };
    });

    res.sendSuccess({
      startDate,
      endDate,
      data: formattedData
    });
  } catch (error) {
    console.error('Day of week report error:', error);
    res.sendError('Failed to fetch day of week report', 500, error.message);
  }
});

/**
 * GET /api/reports/comparison/month-over-month
 * Compare current month with previous month
 * Query params: month (YYYY-MM, defaults to current)
 */
router.get('/comparison/month-over-month', async (req, res) => {
  try {
    const db = await getDatabase();
    const { month } = req.query;

    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const prevMonth = new Date(targetMonth + '-01');
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = prevMonth.toISOString().substring(0, 7);

    const currentMonthDataResult = await db.query(
      `SELECT
        COUNT(*) as orders,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as avg_order,
        COUNT(DISTINCT customer_id) as customers
      FROM orders
      WHERE TO_CHAR(created_at, 'YYYY-MM') = $1`,
      [targetMonth]
    );
    const currentMonthData = currentMonthDataResult.rows[0];

    const previousMonthDataResult = await db.query(
      `SELECT
        COUNT(*) as orders,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as avg_order,
        COUNT(DISTINCT customer_id) as customers
      FROM orders
      WHERE TO_CHAR(created_at, 'YYYY-MM') = $1`,
      [prevMonthStr]
    );
    const previousMonthData = previousMonthDataResult.rows[0];

    const currentTotal = roundCurrency(currentMonthData?.total_sales || 0);
    const currentAvg = roundCurrency(currentMonthData?.avg_order || 0);
    const previousTotal = roundCurrency(previousMonthData?.total_sales || 0);
    const previousAvg = roundCurrency(previousMonthData?.avg_order || 0);

    const currentTotalBreakdown = getPriceBreakdown(currentTotal);
    const currentAvgBreakdown = getPriceBreakdown(currentAvg);
    const previousTotalBreakdown = getPriceBreakdown(previousTotal);
    const previousAvgBreakdown = getPriceBreakdown(previousAvg);

    const current = {
      orders: currentMonthData?.orders || 0,
      total_price: currentTotal,
      base_price: currentTotalBreakdown.base_price,
      gst_amount: currentTotalBreakdown.gst_amount,
      avg_order: currentAvg,
      avg_base_price: currentAvgBreakdown.base_price,
      avg_gst_amount: currentAvgBreakdown.gst_amount,
      customers: currentMonthData?.customers || 0
    };
    const previous = {
      orders: previousMonthData?.orders || 0,
      total_price: previousTotal,
      base_price: previousTotalBreakdown.base_price,
      gst_amount: previousTotalBreakdown.gst_amount,
      avg_order: previousAvg,
      avg_base_price: previousAvgBreakdown.base_price,
      avg_gst_amount: previousAvgBreakdown.gst_amount,
      customers: previousMonthData?.customers || 0
    };

    const growth = {
      orders_pct: previous.orders > 0 ? ((current.orders - previous.orders) / previous.orders * 100).toFixed(2) : 0,
      sales_pct: previous.total_price > 0 ? ((current.total_price - previous.total_price) / previous.total_price * 100).toFixed(2) : 0
    };

    res.sendSuccess({
      current_month: { month: targetMonth, ...current },
      previous_month: { month: prevMonthStr, ...previous },
      growth: growth
    });
  } catch (error) {
    console.error('Month over month error:', error);
    res.sendError('Failed to fetch month over month data', 500, error.message);
  }
});

/**
 * GET /api/reports/category-sales
 * Sales breakdown by category
 * Query params: startDate, endDate
 */
router.get('/category-sales', async (req, res) => {
  try {
    const db = await getDatabase();
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.sendError('startDate and endDate are required', 400);
    }

    const categorySalesResult = await db.query(
      `SELECT
        p.category,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_sales,
        COALESCE(AVG(oi.unit_price), 0) as avg_unit_price,
        COUNT(DISTINCT oi.product_id) as distinct_items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE DATE(o.created_at) BETWEEN $1 AND $2
      GROUP BY p.category
      ORDER BY total_sales DESC`,
      [startDate, endDate]
    );
    const categorySales = categorySalesResult.rows;

    const formattedCategorySales = categorySales.map(category => {
      const totalPrice = roundCurrency(category.total_sales);
      const avgPrice = roundCurrency(category.avg_unit_price);
      const totalBreakdown = getPriceBreakdown(totalPrice);
      const avgBreakdown = getPriceBreakdown(avgPrice);

      return {
        ...category,
        total_price: totalPrice,
        base_price: totalBreakdown.base_price,
        gst_amount: totalBreakdown.gst_amount,
        avg_unit_price: avgPrice,
        avg_base_price: avgBreakdown.base_price,
        avg_gst_amount: avgBreakdown.gst_amount
      };
    });

    const totalPrices = formattedCategorySales.map(c => c.total_price);
    const totalRevenue = sumTotalPrices(totalPrices);
    const totalBreakdown = getPriceBreakdown(totalRevenue);

    res.sendSuccess({
      startDate,
      endDate,
      data: formattedCategorySales,
      summary: {
        total_price: totalRevenue,
        base_price: totalBreakdown.base_price,
        gst_amount: totalBreakdown.gst_amount,
        categories: formattedCategorySales.length
      }
    });
  } catch (error) {
    console.error('Category sales report error:', error);
    res.sendError('Failed to fetch category sales report', 500, error.message);
  }
});

/**
 * GET /api/reports/inventory
 * Current inventory status
 * Query params: category (optional), low_stock_only (optional)
 */
router.get('/inventory', async (req, res) => {
  try {
    const db = await getDatabase();
    const { category, low_stock_only = false } = req.query;

    let query = `
      SELECT
        p.id,
        p.name,
        p.category,
        COALESCE(i.current_stock, 0) as current_stock,
        i.min_stock,
        i.max_stock,
        i.reorder_level,
        CASE
          WHEN COALESCE(i.current_stock, 0) <= i.reorder_level THEN 'Reorder'
          WHEN COALESCE(i.current_stock, 0) <= i.min_stock THEN 'Low Stock'
          WHEN COALESCE(i.current_stock, 0) >= i.max_stock THEN 'Overstock'
          ELSE 'In Stock'
        END as stock_status
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.is_active = true
    `;

    const params = [];

    if (category) {
      query += ` AND p.category = $1`;
      params.push(category);
    }

    if (low_stock_only === 'true') {
      query += ` AND (COALESCE(i.current_stock, 0) <= i.reorder_level OR COALESCE(i.current_stock, 0) = 0)`;
    }

    query += ` ORDER BY p.category, stock_status DESC, p.name`;

    const result = await db.query(query, params);
    res.sendSuccess({
      data: result.rows,
      filters: { category: category || 'all', low_stock_only }
    });
  } catch (error) {
    console.error('Inventory report error:', error);
    res.sendError('Failed to fetch inventory report', 500, error.message);
  }
});

/**
 * GET /api/reports/inventory/summary
 * Inventory summary statistics
 */
router.get('/inventory/summary', async (req, res) => {
  try {
    const db = await getDatabase();

    const summaryResult = await db.query(
      `SELECT
        COUNT(DISTINCT p.id) as total_items,
        SUM(COALESCE(i.current_stock, 0)) as total_stock_value,
        COUNT(CASE WHEN COALESCE(i.current_stock, 0) <= i.reorder_level THEN 1 END) as items_to_reorder,
        COUNT(CASE WHEN COALESCE(i.current_stock, 0) <= i.min_stock THEN 1 END) as low_stock_items,
        COUNT(CASE WHEN COALESCE(i.current_stock, 0) >= i.max_stock THEN 1 END) as overstock_items
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.is_active = true`
    );

    res.sendSuccess(summaryResult.rows[0] || {});
  } catch (error) {
    console.error('Inventory summary error:', error);
    res.sendError('Failed to fetch inventory summary', 500, error.message);
  }
});

/**
 * GET /api/reports/accounting
 * Tax and accounting summary
 * Query params: startDate, endDate
 */
router.get('/accounting', async (req, res) => {
  try {
    const db = await getDatabase();
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.sendError('startDate and endDate are required', 400);
    }

    const accountingDataResult = await db.query(
      `SELECT
        COUNT(DISTINCT o.id) as total_transactions,
        COALESCE(SUM(o.total_amount), 0) as total_sales,
        COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.total_amount ELSE 0 END), 0) as cash_received,
        COALESCE(SUM(CASE WHEN o.payment_method = 'card' THEN o.total_amount ELSE 0 END), 0) as card_received,
        COALESCE(SUM(CASE WHEN o.payment_method = 'upi' THEN o.total_amount ELSE 0 END), 0) as digital_received,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_bills,
        COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_bills,
        COUNT(DISTINCT o.customer_id) as unique_customers,
        (SUM(o.total_amount) / COUNT(DISTINCT o.id)) as avg_transaction
      FROM orders o
      WHERE DATE(o.created_at) BETWEEN $1 AND $2`,
      [startDate, endDate]
    );

    const accountingData = accountingDataResult.rows[0];
    const totalPrice = roundCurrency(accountingData?.total_sales || 0);
    const cashPrice = roundCurrency(accountingData?.cash_received || 0);
    const cardPrice = roundCurrency(accountingData?.card_received || 0);
    const digitalPrice = roundCurrency(accountingData?.digital_received || 0);
    const avgPrice = roundCurrency(accountingData?.avg_transaction || 0);

    const totalBreakdown = getPriceBreakdown(totalPrice);
    const cashBreakdown = getPriceBreakdown(cashPrice);
    const cardBreakdown = getPriceBreakdown(cardPrice);
    const digitalBreakdown = getPriceBreakdown(digitalPrice);
    const avgBreakdown = getPriceBreakdown(avgPrice);

    const data = {
      total_transactions: accountingData?.total_transactions || 0,
      total_price: totalPrice,
      total_base_price: totalBreakdown.base_price,
      total_gst_amount: totalBreakdown.gst_amount,
      cash_received: cashPrice,
      cash_base_price: cashBreakdown.base_price,
      cash_gst_amount: cashBreakdown.gst_amount,
      card_received: cardPrice,
      card_base_price: cardBreakdown.base_price,
      card_gst_amount: cardBreakdown.gst_amount,
      digital_received: digitalPrice,
      digital_base_price: digitalBreakdown.base_price,
      digital_gst_amount: digitalBreakdown.gst_amount,
      avg_transaction: avgPrice,
      avg_base_price: avgBreakdown.base_price,
      avg_gst_amount: avgBreakdown.gst_amount,
      pending_bills: accountingData?.pending_bills || 0,
      cancelled_bills: accountingData?.cancelled_bills || 0,
      unique_customers: accountingData?.unique_customers || 0,
      startDate,
      endDate,
      tax_rate: '5%'
    };

    res.sendSuccess(data);
  } catch (error) {
    console.error('Accounting report error:', error);
    res.sendError('Failed to fetch accounting report', 500, error.message);
  }
});

export default router;
