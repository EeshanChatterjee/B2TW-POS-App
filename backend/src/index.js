import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { getDatabase, closeDatabase } from './db/connection.js';
import { initializeDatabase } from './db/init.js';
import { errorHandler, notFound, responseWrapper } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DATABASE_URL || './data/pos.db';

// ============================================
// Middleware
// ============================================

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Response wrapper
app.use(responseWrapper);

// ============================================
// API Routes (Placeholder - will be filled in)
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.sendSuccess({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database status
app.get('/api/db/status', async (req, res) => {
  try {
    const db = await getDatabase(DATABASE_URL);
    const result = await db.all('SELECT COUNT(*) as count FROM products');
    res.sendSuccess({
      database: 'connected',
      products: result[0]?.count || 0
    });
  } catch (error) {
    res.sendError('Database connection failed', 500);
  }
});

// ============================================
// API Route Groups
// ============================================

import authRoutes from './api/auth.js';
import productRoutes from './api/products.js';
import orderRoutes from './api/orders.js';
import billRoutes from './api/bills.js';
import customerRoutes from './api/customers.js';

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/customers', customerRoutes);

// ============================================
// Error Handling
// ============================================

app.use(notFound);
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

async function startServer() {
  try {
    console.log('🚀 Starting Bao to the Wings POS Server...');

    // Initialize database if needed
    try {
      await initializeDatabase(DATABASE_URL);
    } catch (error) {
      console.error('Database initialization warning:', error.message);
    }

    // Get database connection
    const db = await getDatabase(DATABASE_URL);
    console.log('✅ Database connected');

    // Attach database to app for use in routes
    app.locals.db = db;

    // Start server
    app.listen(PORT, process.env.HOST || 'localhost', () => {
      console.log(`
╔════════════════════════════════════════╗
║   BAO TO THE WINGS - POS System       ║
║   Server Running                       ║
╠════════════════════════════════════════╣
║ 📍 URL:  http://localhost:${PORT}              ║
║ 🗄️  DB:   ${DATABASE_URL}              ║
║ 📝 API:  /api/*                       ║
║ ⚕️  Health: /api/health                ║
╚════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await closeDatabase();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
