# Role & permission matrix

Source of truth: `packages/shared/src/permissions.ts` (also rendered at **Admin → Roles & permissions**). Route guards check these permissions; services then apply ownership/assignment rules.

| Permission | Customer | Owner | Agent | Admin | Extra rule |
|---|:-:|:-:|:-:|:-:|---|
| profile, shortlist, saved searches, own enquiries, notifications | ✓ | ✓ | ✓ | ✓ | own records only |
| request / cancel own site visits | ✓ | ✓ | ✓ | ✓ | customer side of visit state machine |
| property:create / edit_own / view_own | | ✓ | ✓ | ✓ | owner **or** assigned agent; others get 404 |
| enquiries & visits on own listings | | ✓ | ✓ | ✓ | owner manages a lead only while no agent is assigned |
| lead:manage_assigned | | | ✓ | ✓ | only leads where `assignedAgentId = me` |
| agent profile & reports | | | ✓ | ✓ | |
| admin:* (dashboard, users, roles, moderation, leads, export, visits, config, content, reports, audit, settings) | | | | ✓ | an admin cannot approve their own listing, suspend themselves or remove their own admin role |

Self-registration can only create **customer** or **owner** accounts. Agents are created/promoted by admins (invite via password-reset link). Role changes revoke the user’s sessions so new tokens carry the new roles.

Guests can browse, search, view published listings, send enquiries and request visits (rate-limited, honeypot, optional CAPTCHA), and contact agents.
