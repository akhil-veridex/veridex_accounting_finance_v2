const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireTenantWorkspace, requirePermission } = require('../middleware/tenantMiddleware');

// Workspace switching requires valid token, but not yet scoped to active workspace
router.post('/switch-workspace', requireAuth, tenantController.switchWorkspace);

// Workspaces scoped endpoints
router.use(requireAuth, requireTenantWorkspace);

// User & Role Management within tenant
router.get('/users', requirePermission('USER:VIEW'), tenantController.getTenantUsers);
router.post('/users/invite', requirePermission('USER:INVITE'), tenantController.inviteTenantUser);
router.get('/roles', tenantController.getRoles);

// Module Entitlement Configuration
router.get('/modules', tenantController.getModuleEntitlements);
router.patch('/modules', requirePermission('MODULE:CONFIGURE'), tenantController.updateModuleEntitlement);

// Organization Settings
router.get('/settings', tenantController.getOrganizationSettings);
router.patch('/settings', requirePermission('MODULE:CONFIGURE'), tenantController.updateOrganizationSettings);

// Developer Testing Helper: Reset Workspace Data
router.post('/reset-dev-data', tenantController.resetDevData);

module.exports = router;
