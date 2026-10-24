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

// Middlewares
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
app.use('/api/auth', authRoutes);
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

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled API error:', err);
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred.'
    });
});

// Local Development Server Listener
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
        console.log(`🚀 Makhana Express API server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
