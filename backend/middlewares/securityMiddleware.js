const { createHttpError } = require("../utils/httpError");

const addSecurityHeaders = (req, res, next) => {
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  next();
};

const createRateLimiter = ({ windowMs = 60_000, max = 120 } = {}) => {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.connection?.remoteAddress || "global";
    const entry = hits.get(key);

    if (!entry || entry.resetTime <= now) {
      hits.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        return next(
          createHttpError("Too many requests, please try again later.", 429)
        );
      }
    }

    if (hits.size > 1000) {
      for (const [storedKey, storedEntry] of hits.entries()) {
        if (storedEntry.resetTime <= now) {
          hits.delete(storedKey);
        }
      }
    }

    next();
  };
};

const requestLogger = (req, res, next) => {
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration.toFixed(2)}ms`;
    if (res.statusCode >= 500) {
      console.error(message);
    } else if (res.statusCode >= 400) {
      console.warn(message);
    } else {
      console.info(message);
    }
  });

  next();
};

module.exports = {
  addSecurityHeaders,
  createRateLimiter,
  requestLogger,
};