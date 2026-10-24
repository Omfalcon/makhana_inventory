// api/middleware/auth.js
const { supabaseAdmin } = require('../utils/supabase');

// In-memory cache for verified tokens & profiles (TTL 60s)
const authCache = new Map();
const AUTH_CACHE_TTL_MS = 60 * 1000;

async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication token missing or invalid format.'
            });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token not provided.'
            });
        }

        // Fast path: Check in-memory cache
        const cached = authCache.get(token);
        if (cached && Date.now() < cached.expiresAt) {
            req.user = cached.user;
            req.profile = cached.profile;
            return next();
        }

        if (!supabaseAdmin) {
            return res.status(500).json({
                error: 'Configuration Error',
                message: 'Supabase server configuration is missing.'
            });
        }

        // Verify token with Supabase Auth
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            authCache.delete(token);
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired session. Please log in again.'
            });
        }

        // Fetch application profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            authCache.delete(token);
            return res.status(403).json({
                error: 'Forbidden',
                message: 'User profile not found or inactive.'
            });
        }

        if (!profile.is_active) {
            authCache.delete(token);
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Your account has been deactivated. Please contact the administrator.'
            });
        }

        // Cache valid auth result
        if (authCache.size > 1000) {
            const oldestKey = authCache.keys().next().value;
            authCache.delete(oldestKey);
        }
        authCache.set(token, {
            user,
            profile,
            expiresAt: Date.now() + AUTH_CACHE_TTL_MS
        });

        req.user = user;
        req.profile = profile;
        next();
    } catch (err) {
        console.error('Authentication middleware error:', err.message);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected authentication error occurred.'
        });
    }
}

function requireRole(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return (req, res, next) => {
        if (!req.profile) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required.'
            });
        }

        if (!roles.includes(req.profile.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Access denied. Requires one of roles: ${roles.join(', ')}`
            });
        }

        next();
    };
}

module.exports = {
    authenticate,
    requireRole
};
