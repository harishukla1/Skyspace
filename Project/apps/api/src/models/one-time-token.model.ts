import { Schema, model, Types } from 'mongoose';

const tokenSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    purpose: { type: String, enum: ['password_reset', 'email_verify'], required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
  },
  { timestamps: true },
);
tokenSchema.index({ userId: 1, purpose: 1 });
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OneTimeToken = model('OneTimeToken', tokenSchema);
