import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ROLES, USER_STATUSES } from '@skyspace/shared';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    /** Stored lower-cased and trimmed. */
    email: { type: String, required: true, lowercase: true, trim: true },
    /** Stored as E.164, e.g. +919876543210. */
    phone: { type: String, required: true },
    passwordHash: { type: String, required: true, select: false },
    roles: { type: [String], enum: ROLES, default: ['customer'] },
    status: { type: String, enum: USER_STATUSES, default: 'active', index: true },
    statusReason: String,
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    profileImage: String,
    city: String,
    marketingOptIn: { type: Boolean, default: false },
    lastLoginAt: Date,
    failedLoginCount: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ roles: 1, status: 1 });
userSchema.index({ createdAt: -1 });

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const User = model('User', userSchema);
