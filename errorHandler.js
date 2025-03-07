/**
 * Error handling middleware
 * This middleware catches errors thrown in routes and returns appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  // SQLite specific errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json({
      error: 'Database constraint violation',
      message: err.message
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }
  
  // Handle unauthorized access
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You do not have permission to perform this action'
    });
  }
  
  // Default to 500 server error
  res.status(500).json({
    error: 'Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
};

module.exports = errorHandler; 