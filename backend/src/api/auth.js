import express from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../db/connection.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bao-to-the-wings-secret-key-change-in-production';
const JWT_EXPIRY = '7d'; // Token expires in 7 days

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 * Body: { username, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.sendError('Username and password are required', 400);
    }

    const db = await getDatabase();

    // Find user by username
    const user = await db.get(
      'SELECT id, username, password_hash, role, is_active FROM admin_users WHERE username = ?',
      [username]
    );

    if (!user) {
      return res.sendError('Invalid username or password', 401);
    }

    // Check if user is active
    if (!user.is_active) {
      return res.sendError('User account is inactive', 403);
    }

    // TODO: In production, use bcrypt to hash and compare passwords
    // For now, simple string comparison (not secure!)
    if (user.password_hash !== password) {
      return res.sendError('Invalid username or password', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.sendSuccess({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      expiresIn: JWT_EXPIRY,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.sendError('Login failed', 500, error.message);
  }
});

/**
 * GET /api/auth/validate
 * Validate JWT token and return user info
 * Headers: Authorization: Bearer <token>
 */
router.get('/validate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.sendError('No token provided', 401);
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    res.sendSuccess({
      valid: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.sendError('Token expired', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return res.sendError('Invalid token', 401);
    }
    res.sendError('Token validation failed', 500, error.message);
  }
});

/**
 * POST /api/auth/logout
 * Logout user (mainly for frontend to clear token)
 */
router.post('/logout', (req, res) => {
  // With JWT, logout is just clearing the token on client side
  // No server-side state needed
  res.sendSuccess({
    message: 'Logout successful'
  });
});

export default router;
