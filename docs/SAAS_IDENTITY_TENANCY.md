# SaaS Identity & Multi-Tenancy Architecture

**Application:** Veridex One Insurance Finance & Accounting SaaS  
**Document Version:** 1.0  
**Effective Date:** October 12, 2026  

---

## 1. Tenancy Model Overview

Veridex One implements a **Logical Shared-Database, Tenant-Scoped Architecture**:
- All tenant entities contain an indexed `tenant_id` attribute.
- Every API request validates the user's active session, retrieves authorized tenant memberships, and enforces tenant scoping server-side via `tenantMiddleware`.
- Platform Administration (`PLATFORM_SUPER_ADMIN`) operates outside individual tenant ledgers and must explicitly activate a tenant context to inspect ledger data.
- Tenant Administration (`TENANT_ADMIN`) manages local users, invites, role assignments, and module entitlements.

---

## 2. Foundation Identity Schemas

### 1. `Tenant` (`tenant_masters`)
- `tenant_id`: String (Unique slug/code, e.g. `TENANT-LONE-PINE`, `TENANT-APEX-RISK`)
- `tenant_name`: String (e.g. `Harbor Underwriting MGA - Commercial Fleet`)
- `legal_name`: String
- `industry_segment`: Enum (`COMMERCIAL_AUTO_MGA`, `EXCESS_SURPLUS_LINES`, `REINSURANCE_BROKER`)
- `country`: String (default `US`)
- `base_currency`: String (default `USD`)
- `timezone`: String (default `America/Chicago`)
- `status`: Enum (`ACTIVE`, `SUSPENDED`, `ONBOARDING`)
- `subscription_tier`: Enum (`STARTER`, `GROWTH`, `ENTERPRISE`)

### 2. `User` (`app_users`)
- `user_id`: String (UUID or format `USR-XXXX`)
- `email`: String (Normalized lowercase, unique across platform)
- `password_hash`: String (SHA-256 hash, never plaintext)
- `full_name`: String
- `status`: Enum (`ACTIVE`, `INVITED`, `SUSPENDED`)
- `last_login_at`: Date
- `created_at` / `updated_at`: Timestamps

### 3. `TenantMembership` (`tenant_memberships`)
- `membership_id`: String
- `user_id`: String (references `User`)
- `tenant_id`: String (references `Tenant`)
- `status`: Enum (`ACTIVE`, `PENDING_ACCEPTANCE`, `REVOKED`)
- `is_default_workspace`: Boolean
- Unique compound index: `{ user_id: 1, tenant_id: 1 }`

### 4. `Role` (`roles`) & `UserRole` (`user_roles`)
- `role_code`: String (`PLATFORM_SUPER_ADMIN`, `TENANT_ADMIN`, `FINANCE_ADMIN`, `ACCOUNTANT`, `BILLING_OPERATOR`, `TREASURY_OPERATOR`, `FINANCE_CONTROLLER`, `AUDITOR_READ_ONLY`)
- `scope`: Enum (`PLATFORM`, `TENANT`)
- `permissions`: Array of Strings (e.g. `['gl:read', 'gl:post_journal', 'billing:*']`)

### 5. `TenantModuleEntitlement` (`tenant_module_entitlements`)
- `tenant_id`: String
- `module_key`: Enum (`core_gl`, `billing_ar`, `treasury_recon`, `commissions_fiduciary`, `finance_close_erp`)
- `is_enabled`: Boolean
- `effective_from`: Date
- `effective_to`: Date

---

## 3. SaaS Authentication & Onboarding Lifecycle

```
Unauthenticated User
       │
       ├──> POST /api/auth/register-tenant (Self-Service Onboarding)
       │         └── Atomic creation: Tenant + User + Membership + TenantAdmin Role + Module Entitlements
       │
       ├──> POST /api/auth/login
       │         └── Validates credentials -> Issues JWT/Session -> Returns allowed tenant workspaces
       │
Authenticated User
       ├──> Active Workspace Selected (Headers: X-Tenant-ID, Authorization: Bearer <token>)
       │         └── Tenant Middleware enforces scoping on all 47 finance models
       │
       └──> Switch Workspace -> POST /api/tenants/:tenantId/activate
```

---

## 4. Role-Based Access Control (RBAC) Matrix

| Action | Super Admin | Tenant Admin | Finance Admin | Accountant | Billing Op | Treasury Op | Controller | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Tenant Management | Yes | No | No | No | No | No | No | No |
| User Admin (Tenant) | Yes | Yes | No | No | No | No | No | No |
| Post Journals | No | No | Yes | Yes | No | No | Yes | No |
| Invoice / AR Billing | No | No | Yes | No | Yes | No | Yes | Read |
| Bank Statement Recon | No | No | Yes | No | No | Yes | Yes | Read |
| Bordereau Settlement | No | No | Yes | No | No | No | Yes | Read |
| Month-End Hard Close | No | No | No | No | No | No | Yes | No |
| Audit / View Reports | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
