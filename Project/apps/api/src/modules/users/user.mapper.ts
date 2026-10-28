import type { UserDTO, Role, UserStatus } from '@skyspace/shared';
import { toIso } from '../../utils/http';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toUserDTO(u: any): UserDTO {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    phone: u.phone,
    roles: u.roles as Role[],
    status: u.status as UserStatus,
    emailVerified: !!u.emailVerified,
    phoneVerified: !!u.phoneVerified,
    profileImage: u.profileImage ?? undefined,
    city: u.city ?? undefined,
    marketingOptIn: !!u.marketingOptIn,
    createdAt: toIso(u.createdAt)!,
    lastLoginAt: toIso(u.lastLoginAt),
  };
}
