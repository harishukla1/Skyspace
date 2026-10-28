import { Schema, model, Types } from 'mongoose';

/**
 * One document per login session. The refresh token rotates on every refresh; reuse of an already-rotated
 * token revokes the whole session (token theft detection).
 */
const sessionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    previousTokenHashes: { type: [String], default: [] },
    userAgent: String,
    ip: String,
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    lastUsedAt: Date,
  },
  { timestamps: true },
);
sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ previousTokenHashes: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 86_400 });

export const Session = model('Session', sessionSchema);
