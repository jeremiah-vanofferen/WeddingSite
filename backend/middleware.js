// Copyright 2026 Jeremiah Van Offeren

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const isRelaxedRateLimitEnv = ['test', 'development'].includes(process.env.NODE_ENV);
const parseRateLimitMax = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseRateLimitMax(process.env.RATE_LIMIT_MAX, isRelaxedRateLimitEnv ? 10000 : 100),
  message: { error: 'Too many requests, please try again later' }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseRateLimitMax(process.env.STRICT_RATE_LIMIT_MAX, isRelaxedRateLimitEnv ? 10000 : 20),
  message: { error: 'Too many requests, please try again later' }
});

const requirePublicAccessToken = process.env.NODE_ENV !== 'test';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    if (!user.id || !user.username) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const authenticatePublicToken = (req, res, next) => {
  if (!requirePublicAccessToken) return next();
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Public access token required' });
  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err || payload?.type !== 'public') {
      return res.status(403).json({ error: 'Invalid public access token' });
    }
    req.publicToken = payload;
    next();
  });
};

const sendError = (res, status, message) => res.status(status).json({ error: message });
const sendBadRequest = (res, message) => sendError(res, 400, message);
const sendNotFound = (res, message) => sendError(res, 404, message);
const sendInternalError = (res, context, error) => {
  console.error(`${context}:`, error);
  return sendError(res, 500, 'Internal server error');
};

module.exports = {
  limiter,
  strictLimiter,
  authenticateToken,
  authenticatePublicToken,
  sendError,
  sendBadRequest,
  sendNotFound,
  sendInternalError
};
