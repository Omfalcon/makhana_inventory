// api/middleware/auth.js
const { supabaseAdmin } = require('../utils/supabase');

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

        if (!supabaseAdmin) {
            return res.status(500).json({
                error: 'Configuration Error',
                message: 'Supabase server configuration is missing.'
            });
        }

        // Verify token with Supabase Auth
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
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
            return res.status(403).json({
                error: 'Forbidden',
                message: 'User profile not found or inactive.'
            });
        }

        if (!profile.is_active) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Your account has been deactivated. Please contact the administrator.'
            });
        }

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
