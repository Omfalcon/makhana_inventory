// api/utils/websocket.js
const { WebSocketServer, WebSocket } = require('ws');

let wss = null;

function initWebSocket(server) {
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws) => {
        ws.isAlive = true;
        ws.user = null;

        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('message', (message) => {
            try {
                const parsed = JSON.parse(message);
                if (parsed.type === 'IDENTIFY') {
                    ws.user = {
                        id: parsed.userId,
                        role: parsed.role,
                        fullName: parsed.fullName
                    };
                    ws.send(JSON.stringify({
                        type: 'IDENTIFIED',
                        payload: { status: 'ok', role: parsed.role }
                    }));
                } else if (parsed.type === 'PING') {
                    ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
                }
            } catch (err) {
                // ignore invalid JSON
            }
        });

        ws.on('error', (err) => {
            console.warn('WebSocket client error:', err.message);
        });

        // Initial welcome handshake
        ws.send(JSON.stringify({
            type: 'CONNECTED',
            payload: { timestamp: Date.now(), message: 'Connected to Makhana Realtime WebSocket' }
        }));
    });

    // Heartbeat every 30s to keep connection alive and drop stale clients
    const interval = setInterval(() => {
        if (!wss) return;
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(interval);
    });

    console.log('📡 WebSocket server successfully attached on /ws');
    return wss;
}

/**
 * Broadcast an event to connected clients.
 * @param {string} event - e.g. 'ORDER_CREATED', 'STOCK_UPDATED', 'ORDER_STATUS_CHANGED'
 * @param {object} payload - data payload
 * @param {string|null} targetRole - 'ADMIN' | 'SALESMAN' | null (all)
 */
function broadcast(event, payload = {}, targetRole = null) {
    if (!wss) return;

    const message = JSON.stringify({
        type: event,
        payload,
        timestamp: Date.now()
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            if (targetRole && client.user?.role && client.user.role !== targetRole) {
                return;
            }
            try {
                client.send(message);
            } catch (err) {
                console.warn('Error broadcasting WebSocket message:', err.message);
            }
        }
    });
}

module.exports = {
    initWebSocket,
    broadcast
};
