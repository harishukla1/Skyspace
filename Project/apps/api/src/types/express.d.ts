import type { Role } from '@skyspace/shared';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      name: string;
      email: string;
      roles: Role[];
    }
    interface Request {
      user?: AuthUser;
      /** Validated query/params produced by the validate() middleware. */
      valid: { query?: unknown; params?: unknown };
    }
  }
}

export {};
