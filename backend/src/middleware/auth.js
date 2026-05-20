import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bao-to-the-wings-secret-key-change-in-production';

/**
 * Middleware to verify JWT token
 * Extracts token from Authorization header and attaches user info to req.user
 */
export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.sendError('No authorization token provided', 401);
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.sendError('Token expired', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return res.sendError('Invalid token', 401);
    }
    res.sendError('Authentication failed', 401, error.message);
  }
}

/**
 * Middleware to check user role
 * Use: requireRole(['admin', 'manager'])
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.sendError('User not authenticated', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.sendError('Insufficient permissions for this action', 403);
    }

    next();
  };
}

/**
 * Middleware to attach token from request to response headers for frontend
 */
export function attachTokenToHeaders(req, res, next) {
  const token = req.headers.authorization?.substring(7);
  if (token) {
    res.setHeader('X-Auth-Token', token);
  }
  next();
}
