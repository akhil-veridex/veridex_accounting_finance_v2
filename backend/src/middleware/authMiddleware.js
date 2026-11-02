const jwt = require('jsonwebtoken');
const { User, TenantMembership, Tenant } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'veridex_saas_finance_super_secret_jwt_2026';

function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.error('Authorization token required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'ACTIVE') {
      return res.error('User not found or account is deactivated', 401);
    }

    req.userId = user._id;
    req.user = user;
    
    // Explicit tenant override header if switching workspaces, or token active tenant
    const headerTenantId = req.headers['x-tenant-id'];
    const activeTenantId = headerTenantId || decoded.tenantId || (user.default_tenant_id ? user.default_tenant_id.toString() : null);

    if (activeTenantId) {
      req.tenantId = activeTenantId;
    }

    next();
  } catch (err) {
    return res.error('Invalid or expired authentication token', 401, err.message);
  }
}

module.exports = {
  generateToken,
  requireAuth
};
