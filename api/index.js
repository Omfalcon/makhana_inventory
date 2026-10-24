// api/index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const { initWebSocket } = require('./utils/websocket');
const authRoutes = require('./routes/auth');
const ordersRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const settingsRoutes = require('./routes/settings');
const invoicesRoutes = require('./routes/invoices');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const server = http.createServer(app);

// Attach WebSocket Server
initWebSocket(server);

// Security & Middlewares
app.disable('x-powered-by');

// Security HTTP Response Headers (OWASP)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// In-Memory Rate Limiter for Auth Routes (Prevents brute-force & credential enumeration)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_AUTH_REQUESTS_PER_MIN = 35;

const authRateLimiter = (req, res, next) => {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(clientIp) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

    if (now > entry.resetTime) {
        entry.count = 1;
        entry.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
        entry.count += 1;
    }
    rateLimitMap.set(clientIp, entry);

    if (entry.count > MAX_AUTH_REQUESTS_PER_MIN) {
        return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Too many authentication attempts. Please wait a minute and try again.'
        });
    }
    next();
};

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap.entries()) {
        if (now > entry.resetTime) rateLimitMap.delete(ip);
    }
}, 5 * 60 * 1000);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
    return res.json({
        status: 'ok',
        service: 'makhana-management-api',
        timestamp: new Date().toISOString()
    });
});

// Mount Routes
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 Route Handler
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `API route ${req.method} ${req.originalUrl} not found.`
    });
});

// Global Error Handler - Prevents Stack & Internal Network Information Leaks
app.use((err, req, res, next) => {
    console.error('Unhandled API error:', err);
    const status = err.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';

    res.status(status).json({
        error: err.name || 'Internal Server Error',
        message: status < 500
            ? err.message
            : (isProduction ? 'An internal server error occurred. Please try again later.' : (err.message || 'An unexpected error occurred.'))
    });
});

// Server Listener (Runs when executed directly or locally; exports app for Vercel services/serverless)
const PORT = process.env.PORT || 5000;
if (require.main === module || (!process.env.VERCEL && process.env.NODE_ENV !== 'production')) {
    server.listen(PORT, () => {
        console.log(`🚀 Makhana Express API server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
