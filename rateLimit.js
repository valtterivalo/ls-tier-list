// Simple in-memory rate limiting middleware
// In a production environment, you might want to use a more robust solution with Redis

// Track requests by IP address
const requestCounts = {};

// Clear request counts every 24 hours
setInterval(() => {
  console.log('Clearing rate limit counters');
  Object.keys(requestCounts).forEach(key => {
    requestCounts[key] = 0;
  });
}, 24 * 60 * 60 * 1000);

/**
 * Rate limiting middleware
 * @param {number} maxRequests - Maximum number of requests allowed in the time window
 * @returns {function} Express middleware function
 */
const rateLimit = (maxRequests = 50) => {
  return (req, res, next) => {
    // Get client IP
    const ip = req.ip || req.connection.remoteAddress;
    
    // Check if this is the first request from this IP
    if (!requestCounts[ip]) {
      requestCounts[ip] = 0;
    }
    
    // Increment request count
    requestCounts[ip]++;
    
    // Check if rate limit exceeded
    if (requestCounts[ip] > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests, please try again later.'
      });
    }
    
    // If not exceeded, proceed
    next();
  };
};

module.exports = rateLimit; 