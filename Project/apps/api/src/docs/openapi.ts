import type { ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as S from '@skyspace/shared';
import { PERMISSIONS, type Permission } from '@skyspace/shared';

type Auth = 'none' | 'optional' | 'required';
interface RouteDoc {
  method: 'get' | 'post' | 'patch' | 'put' | 'delete';
  path: string;
  tag: string;
  summary: string;
  auth: Auth;
  permission?: Permission;
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  multipart?: boolean;
  paginated?: boolean;
  access?: string;
  success?: number;
}

const r = (method: RouteDoc['method'], path: string, tag: string, summary: string, auth: Auth, extra: Partial<RouteDoc> = {}): RouteDoc => ({ method, path, tag, summary, auth, ...extra });

/** Single source of truth for API documentation. Keep in sync with module routers (checked by test/openapi.test.ts). */
export const ROUTES: RouteDoc[] = [
  r('get', '/auth/csrf', 'Auth', 'Issue CSRF token (sets ssr_csrf cookie, returns token for X-CSRF-Token header)', 'none'),
  r('post', '/auth/register', 'Auth', 'Register as customer or owner', 'none', { body: S.registerSchema, success: 201 }),
  r('post', '/auth/login', 'Auth', 'Sign in; sets httpOnly access & refresh cookies', 'none', { body: S.loginSchema }),
  r('post', '/auth/refresh', 'Auth', 'Rotate refresh token and issue a new access token', 'none'),
  r('post', '/auth/logout', 'Auth', 'Revoke current session', 'none', { success: 204 }),
  r('get', '/auth/me', 'Auth', 'Current user', 'required'),
  r('post', '/auth/forgot-password', 'Auth', 'Send reset link (always 200 to prevent enumeration)', 'none', { body: S.forgotPasswordSchema }),
  r('post', '/auth/reset-password', 'Auth', 'Reset password with token; revokes all sessions', 'none', { body: S.resetPasswordSchema }),
  r('post', '/auth/verify-email', 'Auth', 'Confirm email address', 'none'),
  r('post', '/auth/resend-verification', 'Auth', 'Resend verification email', 'required'),

  r('get', '/properties', 'Properties', 'Search published listings', 'none', { query: S.propertySearchSchema, paginated: true }),
  r('post', '/properties', 'Properties', 'Create a draft listing', 'required', { permission: 'property:create', body: S.propertyDraftSchema, success: 201 }),
  r('get', '/properties/{slug}', 'Properties', 'Listing details (published/sold/rented, or any status for its owner/agent/admin)', 'optional'),
  r('get', '/properties/{id}/similar', 'Properties', 'Similar published listings', 'none'),
  r('patch', '/properties/{id}', 'Properties', 'Edit listing. Material changes to a published listing send it back to Pending Approval', 'required', { permission: 'property:edit_own', body: S.propertyUpdateSchema, access: 'Owner, assigned agent or admin' }),
  r('delete', '/properties/{id}', 'Properties', 'Archive listing (soft delete)', 'required', { permission: 'property:edit_own', access: 'Owner, assigned agent or admin' }),
  r('post', '/properties/{id}/submit', 'Properties', 'Submit for approval (full validation + ≥1 photo)', 'required', { permission: 'property:edit_own', access: 'Owner, assigned agent or admin' }),
  r('post', '/properties/{id}/status', 'Properties', 'Owner status change (sold, rented, unavailable, draft, archived) per state machine', 'required', { permission: 'property:edit_own', body: S.listingStatusChangeSchema }),
  r('post', '/properties/{id}/images', 'Properties', 'Upload up to 10 images (JPEG/PNG/WebP, 5 MB each, 20 per listing)', 'required', { permission: 'property:edit_own', multipart: true, success: 201 }),
  r('patch', '/properties/{id}/images', 'Properties', 'Reorder images / edit alt text', 'required', { permission: 'property:edit_own' }),
  r('delete', '/properties/{id}/images/{imageId}', 'Properties', 'Remove image', 'required', { permission: 'property:edit_own' }),
  r('post', '/properties/{id}/report', 'Properties', 'Report a listing', 'optional', { body: S.reportListingSchema, success: 201 }),
  r('get', '/owner/properties', 'Owner & Agent', 'My listings (owned or assigned)', 'required', { permission: 'property:view_own', paginated: true }),
  r('get', '/owner/properties/{id}', 'Owner & Agent', 'Managed listing with status history', 'required', { permission: 'property:view_own' }),
  r('get', '/owner/enquiries', 'Owner & Agent', 'Enquiries on my listings', 'required', { permission: 'enquiry:view_for_own_listings', paginated: true }),
  r('get', '/owner/site-visits', 'Owner & Agent', 'Visit requests on my listings', 'required', { permission: 'visit:manage_for_own_listings', paginated: true }),
  r('get', '/owner/reports', 'Owner & Agent', 'Listing performance', 'required', { permission: 'property:view_own' }),

  r('get', '/users/me', 'Account', 'My profile', 'required'),
  r('patch', '/users/me', 'Account', 'Update profile', 'required', { body: S.updateProfileSchema }),
  r('post', '/users/me/password', 'Account', 'Change password (revokes sessions)', 'required', { body: S.changePasswordSchema }),
  r('post', '/users/me/logout-all', 'Account', 'Sign out of all devices', 'required', { success: 204 }),
  r('post', '/users/me/deactivate', 'Account', 'Deactivate my account', 'required', { success: 204 }),
  r('get', '/users/me/shortlist', 'Account', 'Shortlisted properties', 'required', { paginated: true }),
  r('get', '/users/me/shortlist/ids', 'Account', 'IDs of shortlisted properties', 'required'),
  r('post', '/users/me/shortlist/{propertyId}', 'Account', 'Shortlist a property (idempotent)', 'required'),
  r('delete', '/users/me/shortlist/{propertyId}', 'Account', 'Remove from shortlist', 'required'),
  r('get', '/users/me/saved-searches', 'Account', 'Saved searches', 'required'),
  r('post', '/users/me/saved-searches', 'Account', 'Save a search', 'required', { body: S.savedSearchSchema, success: 201 }),
  r('patch', '/users/me/saved-searches/{id}', 'Account', 'Update saved search', 'required', { body: S.savedSearchUpdateSchema }),
  r('delete', '/users/me/saved-searches/{id}', 'Account', 'Delete saved search', 'required', { success: 204 }),
  r('get', '/users/me/enquiries', 'Account', 'Enquiries I submitted', 'required', { paginated: true }),
  r('get', '/users/me/site-visits', 'Account', 'My site visit requests', 'required', { paginated: true }),
  r('get', '/users/me/notifications', 'Account', 'Notifications', 'required', { paginated: true }),
  r('post', '/users/me/notifications/{id}/read', 'Account', 'Mark notification read', 'required', { success: 204 }),
  r('post', '/users/me/notifications/read-all', 'Account', 'Mark all read', 'required', { success: 204 }),

  r('post', '/enquiries', 'Leads', 'Submit an enquiry (duplicate + honeypot + rate-limit protected)', 'optional', { body: S.enquiryCreateSchema, success: 201 }),
  r('get', '/enquiries/{id}', 'Leads', 'Enquiry detail', 'required', { access: 'Admin, assigned agent, listing owner; enquirer sees a reduced view' }),
  r('patch', '/enquiries/{id}/status', 'Leads', 'Update lead status / follow-up', 'required', { body: S.enquiryStatusSchema, access: 'Admin, assigned agent, or owner when unassigned' }),
  r('post', '/enquiries/{id}/notes', 'Leads', 'Add follow-up note', 'required', { body: S.enquiryNoteSchema }),
  r('patch', '/enquiries/{id}/assignment', 'Leads', 'Assign / unassign agent', 'required', { permission: 'admin:leads_manage', body: S.enquiryAssignSchema }),
  r('get', '/agent/enquiries', 'Owner & Agent', 'Leads assigned to me', 'required', { permission: 'lead:manage_assigned', paginated: true }),

  r('post', '/site-visits', 'Site visits', 'Request a visit (status Pending Confirmation)', 'optional', { body: S.siteVisitCreateSchema, success: 201 }),
  r('patch', '/site-visits/{id}/status', 'Site visits', 'Confirm / reject / cancel / complete / no-show', 'required', { body: S.siteVisitStatusSchema, access: 'Customer (cancel, accept reschedule) or owner/agent/admin' }),
  r('patch', '/site-visits/{id}/reschedule', 'Site visits', 'Propose a new time', 'required', { body: S.siteVisitRescheduleSchema }),
  r('get', '/agent/site-visits', 'Owner & Agent', 'Visits on my assigned/owned listings', 'required', { permission: 'visit:manage_for_own_listings', paginated: true }),

  r('get', '/agents', 'Agents', 'Public agent directory', 'none', { paginated: true }),
  r('get', '/agents/{slug}', 'Agents', 'Agent profile with listings', 'none'),
  r('get', '/agent/profile', 'Owner & Agent', 'My agent profile', 'required', { permission: 'agent:profile_manage' }),
  r('patch', '/agent/profile', 'Owner & Agent', 'Update my agent profile', 'required', { permission: 'agent:profile_manage', body: S.agentProfileSchema }),
  r('get', '/agent/reports', 'Owner & Agent', 'Performance for my listings and leads', 'required', { permission: 'property:view_own' }),

  r('get', '/content/home', 'Content', 'Homepage data', 'none'),
  r('get', '/content/site', 'Content', 'FAQs, testimonials, static pages, contact settings', 'none'),
  r('get', '/content/sitemap', 'Content', 'Slugs for sitemap generation', 'none'),
  r('post', '/content/contact', 'Content', 'Contact form (stored as a lead)', 'optional', { body: S.contactFormSchema, success: 201 }),
  r('post', '/content/newsletter', 'Content', 'Newsletter subscription', 'none', { body: S.newsletterSchema, success: 201 }),
  r('get', '/cities', 'Content', 'Active cities', 'none'),
  r('get', '/cities/{slug}', 'Content', 'City with localities & counts', 'none'),
  r('get', '/categories', 'Content', 'Active property types', 'none'),

  r('get', '/admin/dashboard', 'Admin', 'KPIs and charts (from, to ISO dates)', 'required', { permission: 'admin:dashboard' }),
  r('get', '/admin/properties', 'Admin', 'Search all listings', 'required', { permission: 'admin:properties_moderate', paginated: true }),
  r('get', '/admin/properties/{id}', 'Admin', 'Listing with owner, history, reports', 'required', { permission: 'admin:properties_moderate' }),
  r('post', '/admin/properties/{id}/approve', 'Admin', 'Approve (and publish if autoPublishOnApprove). Admins cannot approve their own listing', 'required', { permission: 'admin:properties_moderate', body: S.moderationCommentSchema }),
  r('post', '/admin/properties/{id}/publish', 'Admin', 'Publish approved/suspended listing', 'required', { permission: 'admin:properties_moderate' }),
  r('post', '/admin/properties/{id}/reject', 'Admin', 'Reject with reason', 'required', { permission: 'admin:properties_moderate', body: S.rejectSchema }),
  r('post', '/admin/properties/{id}/suspend', 'Admin', 'Suspend with reason', 'required', { permission: 'admin:properties_moderate', body: S.rejectSchema }),
  r('post', '/admin/properties/{id}/status', 'Admin', 'Any admin-permitted transition (archive, sold, rented…)', 'required', { permission: 'admin:properties_moderate', body: S.listingStatusChangeSchema }),
  r('patch', '/admin/properties/{id}/feature', 'Admin', 'Feature / unfeature (published only)', 'required', { permission: 'admin:content_manage', body: S.featureSchema }),
  r('patch', '/admin/properties/{id}/verification', 'Admin', 'Record verification outcome', 'required', { permission: 'admin:properties_moderate', body: S.verificationSchema }),
  r('patch', '/admin/properties/{id}/agent', 'Admin', 'Assign agent to listing', 'required', { permission: 'admin:properties_moderate', body: S.assignAgentSchema }),
  r('get', '/admin/users', 'Admin', 'Search users', 'required', { permission: 'admin:users_manage', paginated: true }),
  r('get', '/admin/users/{id}', 'Admin', 'User detail & activity', 'required', { permission: 'admin:users_manage' }),
  r('patch', '/admin/users/{id}/status', 'Admin', 'Suspend / reactivate / deactivate (revokes sessions)', 'required', { permission: 'admin:users_manage', body: S.userStatusSchema }),
  r('patch', '/admin/users/{id}/roles', 'Admin', 'Set roles', 'required', { permission: 'admin:roles_manage', body: S.userRolesSchema }),
  r('get', '/admin/agents', 'Admin', 'Agents with workload', 'required', { permission: 'admin:users_manage', paginated: true }),
  r('post', '/admin/agents', 'Admin', 'Create or promote an agent (invites by reset link)', 'required', { permission: 'admin:users_manage', body: S.agentCreateSchema, success: 201 }),
  r('get', '/admin/agents/{id}/performance', 'Admin', 'Agent performance', 'required', { permission: 'admin:users_manage' }),
  r('get', '/admin/enquiries', 'Admin', 'All leads (status, q, agentId, propertyId, from, to)', 'required', { permission: 'admin:leads_manage', paginated: true }),
  r('get', '/admin/enquiries/export', 'Admin', 'CSV export (audited)', 'required', { permission: 'admin:leads_export' }),
  r('get', '/admin/site-visits', 'Admin', 'All site visits', 'required', { permission: 'admin:visits_manage', paginated: true }),
  r('get', '/admin/categories', 'Admin', 'All categories', 'required', { permission: 'admin:config_manage' }),
  r('post', '/admin/categories', 'Admin', 'Create category', 'required', { permission: 'admin:config_manage', body: S.categorySchema, success: 201 }),
  r('patch', '/admin/categories/{id}', 'Admin', 'Update category', 'required', { permission: 'admin:config_manage' }),
  r('delete', '/admin/categories/{id}', 'Admin', 'Delete unused category', 'required', { permission: 'admin:config_manage', success: 204 }),
  r('get', '/admin/cities', 'Admin', 'All cities', 'required', { permission: 'admin:config_manage' }),
  r('post', '/admin/cities', 'Admin', 'Create city', 'required', { permission: 'admin:config_manage', body: S.citySchema, success: 201 }),
  r('patch', '/admin/cities/{id}', 'Admin', 'Update city / localities', 'required', { permission: 'admin:config_manage' }),
  r('delete', '/admin/cities/{id}', 'Admin', 'Delete city without listings', 'required', { permission: 'admin:config_manage', success: 204 }),
  r('get', '/admin/content', 'Admin', 'Site content & settings', 'required', { permission: 'admin:content_manage' }),
  r('put', '/admin/content', 'Admin', 'Update banners, FAQs, testimonials, pages, SEO', 'required', { permission: 'admin:content_manage', body: S.siteContentSchema }),
  r('put', '/admin/settings', 'Admin', 'Update platform settings', 'required', { permission: 'admin:settings_manage', body: S.platformSettingsSchema }),
  r('get', '/admin/reports', 'Admin', 'Listing reports / complaints', 'required', { permission: 'admin:reports_manage', paginated: true }),
  r('patch', '/admin/reports/{id}', 'Admin', 'Update report status', 'required', { permission: 'admin:reports_manage', body: S.reportStatusSchema }),
  r('get', '/admin/audit-logs', 'Admin', 'Audit log (entityType, action, actorId)', 'required', { permission: 'admin:audit_view', paginated: true }),
];

const json = (schema: ZodTypeAny) => zodToJsonSchema(schema, { target: 'openApi3', $refStrategy: 'none' }) as Record<string, unknown>;

const errorResponse = (description: string) => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });

export function buildOpenApi() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const rt of ROUTES) {
    const params = [...rt.path.matchAll(/\{(\w+)\}/g)].map((m) => ({ name: m[1], in: 'path', required: true, schema: { type: 'string' } }));
    const query = rt.query
      ? Object.entries((json(rt.query).properties as Record<string, Record<string, unknown>>) ?? {}).map(([name, schema]) => ({ name, in: 'query', required: false, schema }))
      : rt.paginated
        ? [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
          ]
        : [];
    const roles = rt.permission ? (PERMISSIONS[rt.permission] as readonly string[]).join(', ') : undefined;
    const description = [
      `**Authentication:** ${rt.auth === 'none' ? 'not required' : rt.auth === 'optional' ? 'optional (links the record to the signed-in user)' : 'required'}`,
      rt.permission ? `**Permission:** \`${rt.permission}\` (roles: ${roles})` : undefined,
      rt.access ? `**Access rule:** ${rt.access}` : undefined,
      rt.paginated ? '**Pagination:** `page` (≥1), `limit` (1–50). Response: `{ items, page, limit, total, totalPages }`' : undefined,
      rt.method !== 'get' ? '**CSRF:** send `X-CSRF-Token` matching the `ssr_csrf` cookie (from `GET /auth/csrf`) on cookie-authenticated requests.' : undefined,
    ].filter(Boolean).join('\n\n');
    const op: Record<string, unknown> = {
      tags: [rt.tag],
      summary: rt.summary,
      description,
      parameters: [...params, ...query],
      security: rt.auth === 'required' ? [{ cookieAuth: [] }, { bearerAuth: [] }] : rt.auth === 'optional' ? [{}, { cookieAuth: [] }] : [],
      responses: {
        [String(rt.success ?? 200)]: { description: 'Success' },
        ...(rt.body || rt.query ? { 400: errorResponse('Validation error') } : {}),
        ...(rt.auth === 'required' ? { 401: errorResponse('Not signed in'), 403: errorResponse('Insufficient permission / CSRF failure') } : {}),
        ...(rt.path.includes('{') ? { 404: errorResponse('Not found (also returned when the caller may not see the record)') } : {}),
        ...(rt.method !== 'get' ? { 409: errorResponse('Conflict / invalid status transition'), 429: errorResponse('Rate limited') } : {}),
      },
    };
    if (rt.body) op.requestBody = { required: true, content: { 'application/json': { schema: json(rt.body) } } };
    if (rt.multipart) {
      op.requestBody = { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { images: { type: 'array', items: { type: 'string', format: 'binary' } }, altText: { type: 'string' } } } } } };
    }
    (paths[rt.path] ??= {})[rt.method] = op;
  }
  return {
    openapi: '3.0.3',
    info: {
      title: 'Sky Space Realty API',
      version: '1.0.0',
      description: 'REST API for the Sky Space Realty platform. All amounts are INR (integer rupees). Timestamps are ISO-8601 UTC; visit date/timeSlot are IST.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'ssr_at' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: { code: { type: 'string' }, message: { type: 'string' }, details: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, message: { type: 'string' } } } } },
            },
          },
        },
      },
    },
    paths,
  };
}
