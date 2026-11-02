const { Tenant, User, TenantMembership, Role, UserRole, TenantModuleEntitlement, RolePermission, Permission } = require('../models');
const { hashPassword, verifyPassword } = require('../utils/crypto');
const { generateToken } = require('../middleware/authMiddleware');

const FINANCE_MODULES = [
  'GL',
  'BILLING_AR',
  'COMMISSIONS_FIDUCIARY',
  'TREASURY_BANK_REC',
  'FINANCE_CLOSE'
];

/**
 * Register a new Tenant with Tenant Admin user, memberships, default roles, and enabled modules
 */
async function registerTenant(req, res) {
  try {
    const {
      tenant_code,
      tenant_name,
      tenant_type = 'MGA',
      base_currency = 'USD',
      admin_first_name,
      admin_last_name,
      admin_email,
      admin_password
    } = req.body;

    if (!tenant_code || !tenant_name || !admin_email || !admin_password || !admin_first_name || !admin_last_name) {
      return res.error('All fields (tenant_code, tenant_name, admin_first_name, admin_last_name, admin_email, admin_password) are required', 400);
    }

    const validTenantTypes = ['CARRIER', 'MGA', 'BROKER', 'OTHER'];
    const normalizedType = (tenant_type || 'MGA').toUpperCase().trim();
    if (!validTenantTypes.includes(normalizedType)) {
      return res.error(`Invalid tenant_type. Must be one of: ${validTenantTypes.join(', ')}`, 400);
    }

    // Check duplicate tenant
    const existingTenant = await Tenant.findOne({ tenant_code: tenant_code.toUpperCase().trim() });
    if (existingTenant) {
      return res.error(`Tenant code "${tenant_code.toUpperCase().trim()}" is already registered`, 409);
    }

    // 1. Create Tenant
    const tenant = await Tenant.create({
      tenant_code: tenant_code.toUpperCase().trim(),
      name: tenant_name.trim(),
      tenant_type: normalizedType,
      base_currency: base_currency.toUpperCase().trim(),
      status: 'ACTIVE'
    });

    // 2. Create or Find User
    let user = await User.findOne({ email: admin_email.toLowerCase().trim() });
    if (!user) {
      user = await User.create({
        email: admin_email.toLowerCase().trim(),
        password_hash: hashPassword(admin_password),
        first_name: admin_first_name.trim(),
        last_name: admin_last_name.trim(),
        default_tenant_id: tenant._id,
        status: 'ACTIVE'
      });
    } else {
      if (!user.default_tenant_id) {
        user.default_tenant_id = tenant._id;
        await user.save();
      }
    }

    // 3. Create TenantMembership
    await TenantMembership.findOneAndUpdate(
      { tenant_id: tenant._id, user_id: user._id },
      { status: 'ACTIVE', joined_at: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4. Assign TENANT_ADMIN role
    // Find system TENANT_ADMIN role or create tenant-specific if needed
    let tenantAdminRole = await Role.findOne({ code: 'TENANT_ADMIN', tenant_id: null });
    if (!tenantAdminRole) {
      tenantAdminRole = await Role.create({
        code: 'TENANT_ADMIN',
        name: 'Tenant Administrator',
        description: 'Full administrative access across all tenant settings and finance modules',
        is_system_role: true
      });
    }

    await UserRole.findOneAndUpdate(
      { tenant_id: tenant._id, user_id: user._id, role_id: tenantAdminRole._id },
      {},
      { upsert: true, setDefaultsOnInsert: true }
    );

    // 5. Initialize Module Entitlements (all 5 enabled by default)
    for (const mod of FINANCE_MODULES) {
      await TenantModuleEntitlement.findOneAndUpdate(
        { tenant_id: tenant._id, module_code: mod },
        { is_enabled: true, config: {} },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // 6. Generate JWT
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      tenantId: tenant._id.toString()
    });

    return res.success({
      token,
      tenant: {
        id: tenant._id.toString(),
        tenant_code: tenant.tenant_code,
        name: tenant.name,
        tenant_type: tenant.tenant_type,
        base_currency: tenant.base_currency,
        status: tenant.status
      },
      user: {
        id: user._id.toString(),
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_platform_admin: user.is_platform_admin
      }
    }, { message: 'Tenant onboarded successfully' }, 201);
  } catch (err) {
    return res.error('Failed to register tenant workspace', 500, err.message);
  }
}

/**
 * User Login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.error('Email and password are required', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.error('Invalid email or password credentials', 401);
    }

    const isMatch = verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.error('Invalid email or password credentials', 401);
    }

    if (user.status !== 'ACTIVE') {
      return res.error(`User account is ${user.status}`, 403);
    }

    // Find available workspaces
    const memberships = await TenantMembership.find({ user_id: user._id, status: 'ACTIVE' }).populate('tenant_id');
    const workspaces = memberships
      .filter(m => m.tenant_id && m.tenant_id.status === 'ACTIVE')
      .map(m => ({
        id: m.tenant_id._id,
        tenant_code: m.tenant_id.tenant_code,
        name: m.tenant_id.name,
        tenant_type: m.tenant_id.tenant_type || 'MGA',
        base_currency: m.tenant_id.base_currency,
        status: m.tenant_id.status
      }));

    // Choose active tenant: user default or first workspace
    let activeTenant = null;
    if (user.default_tenant_id && workspaces.some(w => w.id.toString() === user.default_tenant_id.toString())) {
      activeTenant = workspaces.find(w => w.id.toString() === user.default_tenant_id.toString());
    } else if (workspaces.length > 0) {
      activeTenant = workspaces[0];
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      tenantId: activeTenant ? activeTenant.id.toString() : null
    });

    return res.success({
      token,
      user: {
        id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_platform_admin: user.is_platform_admin
      },
      active_workspace: activeTenant,
      available_workspaces: workspaces
    }, { message: 'Authentication successful' });
  } catch (err) {
    return res.error('Login failed', 500, err.message);
  }
}

/**
 * Get current user & workspace session details
 */
async function getMe(req, res) {
  try {
    const user = req.user;
    
    // Find active memberships
    const memberships = await TenantMembership.find({ user_id: user._id, status: 'ACTIVE' }).populate('tenant_id');
    const workspaces = memberships
      .filter(m => m.tenant_id && m.tenant_id.status === 'ACTIVE')
      .map(m => ({
        id: m.tenant_id._id,
        tenant_code: m.tenant_id.tenant_code,
        name: m.tenant_id.name,
        tenant_type: m.tenant_id.tenant_type || 'MGA',
        base_currency: m.tenant_id.base_currency,
        status: m.tenant_id.status
      }));

    let currentTenant = null;
    let roles = [];
    let permissions = [];
    let entitlements = [];

    if (req.tenantId) {
      currentTenant = await Tenant.findById(req.tenantId);
      if (currentTenant) {
        // Get user roles in this tenant
        const userRoles = await UserRole.find({ tenant_id: currentTenant._id, user_id: user._id }).populate('role_id');
        roles = userRoles.map(ur => ur.role_id ? ur.role_id.code : null).filter(Boolean);

        // Get permissions
        const roleIds = userRoles.map(ur => ur.role_id ? ur.role_id._id : null).filter(Boolean);
        const rolePermissions = await RolePermission.find({ role_id: { $in: roleIds } }).populate('permission_id');
        permissions = [...new Set(rolePermissions.map(rp => rp.permission_id ? rp.permission_id.code : null).filter(Boolean))];

        // Get module entitlements
        const ents = await TenantModuleEntitlement.find({ tenant_id: currentTenant._id });
        entitlements = ents.map(e => ({
          module_code: e.module_code,
          is_enabled: e.is_enabled,
          config: e.config
        }));
      }
    }

    return res.success({
      user: {
        id: user._id.toString(),
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_platform_admin: user.is_platform_admin
      },
      current_workspace: currentTenant ? {
        id: currentTenant._id.toString(),
        tenant_code: currentTenant.tenant_code,
        name: currentTenant.name,
        tenant_type: currentTenant.tenant_type || 'MGA',
        base_currency: currentTenant.base_currency,
        status: currentTenant.status,
        timezone: currentTenant.timezone,
        fiscal_year_start_month: currentTenant.fiscal_year_start_month
      } : null,
      roles,
      permissions,
      entitlements,
      available_workspaces: workspaces.map(w => ({
        ...w,
        id: w.id ? w.id.toString() : w._id ? w._id.toString() : null
      }))
    });
  } catch (err) {
    return res.error('Failed to retrieve user profile', 500, err.message);
  }
}

/**
 * Logout
 */
async function logout(req, res) {
  return res.success({ logged_out: true }, { message: 'Logged out successfully' });
}

module.exports = {
  registerTenant,
  login,
  getMe,
  logout
};
