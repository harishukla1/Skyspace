import { z } from 'zod';
import { normalizeIndianPhone } from '../format';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const pinCode = z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code');
export const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
export const indianPhone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeIndianPhone(v);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid 10-digit Indian mobile number' });
      return z.NEVER;
    }
    return n;
  });
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
export const plainText = (max: number) => z.string().trim().max(max);

/** Query-string helpers: "a,b" or repeated params -> string[] */
export const csvList = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((v) => {
    if (v === undefined || v === '' || v === null) return undefined;
    const arr = Array.isArray(v) ? v : String(v).split(',');
    return arr.map((s) => String(s).trim()).filter(Boolean);
  }, z.array(item).max(30).optional());

export const queryBool = z.preprocess(
  (v) => (v === 'true' || v === '1' || v === true ? true : v === 'false' || v === '0' || v === false ? false : undefined),
  z.boolean().optional(),
);

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
