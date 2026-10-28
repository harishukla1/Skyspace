import type { Role } from './constants';

/**
 * Permission matrix. The backend enforces these on every protected route (see apps/api/src/middleware/auth.ts).
 * Ownership/assignment rules ("own", "assigned") are enforced additionally inside the service layer.
 */
export const PERMISSIONS = {
  'profile:manage_own': ['customer', 'owner', 'agent', 'admin'],
  'shortlist:manage_own': ['customer', 'owner', 'agent', 'admin'],
  'saved_search:manage_own': ['customer', 'owner', 'agent', 'admin'],
  'enquiry:view_own': ['customer', 'owner', 'agent', 'admin'],
  'visit:request': ['customer', 'owner', 'agent', 'admin'],
  'visit:manage_own_request': ['customer', 'owner', 'agent', 'admin'],
  'notification:view_own': ['customer', 'owner', 'agent', 'admin'],

  'property:create': ['owner', 'agent', 'admin'],
  'property:edit_own': ['owner', 'agent', 'admin'],
  'property:view_own': ['owner', 'agent', 'admin'],
  'enquiry:view_for_own_listings': ['owner', 'agent', 'admin'],
  'visit:manage_for_own_listings': ['owner', 'agent', 'admin'],

  'lead:manage_assigned': ['agent', 'admin'],
  'agent:profile_manage': ['agent', 'admin'],
  'agent:reports_view': ['agent', 'admin'],

  'admin:dashboard': ['admin'],
  'admin:users_manage': ['admin'],
  'admin:roles_manage': ['admin'],
  'admin:properties_moderate': ['admin'],
  'admin:leads_manage': ['admin'],
  'admin:leads_export': ['admin'],
  'admin:visits_manage': ['admin'],
  'admin:config_manage': ['admin'],
  'admin:content_manage': ['admin'],
  'admin:reports_manage': ['admin'],
  'admin:audit_view': ['admin'],
  'admin:settings_manage': ['admin'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(roles: readonly Role[] | undefined, permission: Permission): boolean {
  if (!roles?.length) return false;
  const allowed = PERMISSIONS[permission] as readonly Role[];
  return roles.some((r) => allowed.includes(r));
}

export const hasRole = (roles: readonly Role[] | undefined, role: Role) => !!roles?.includes(role);
