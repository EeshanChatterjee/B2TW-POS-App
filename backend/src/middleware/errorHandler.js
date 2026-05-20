/**
 * Global error handling middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: {
      status,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

/**
 * 404 Not Found middleware
 */
export function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: {
      status: 404,
      message: `Route not found: ${req.method} ${req.path}`
    }
  });
}

/**
 * Response wrapper middleware
 */
export function responseWrapper(req, res, next) {
  res.sendSuccess = (data, status = 200) => {
    res.status(status).json({
      success: true,
      data
    });
  };

  res.sendError = (message, status = 400) => {
    res.status(status).json({
      success: false,
      error: { message, status }
    });
  };

  next();
}

export default { errorHandler, notFound, responseWrapper };
