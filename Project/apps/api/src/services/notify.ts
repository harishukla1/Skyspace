import type { NotificationType } from '@skyspace/shared';
import { Notification } from '../models/misc.models';
import { User } from '../models/user.model';
import { sendEmail } from './email';
import { logger } from '../utils/logger';

interface NotifyInput {
  userId: string | { toString(): string } | undefined | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  email?: boolean;
}

/** Creates an in-app notification and optionally emails the user. Failures never break the calling workflow. */
export async function notify(input: NotifyInput) {
  if (!input.userId) return;
  const userId = String(input.userId);
  try {
    await Notification.create({ userId, type: input.type, title: input.title, message: input.message, link: input.link });
    if (input.email) {
      const user = await User.findById(userId).select('email status').lean();
      if (user && user.status === 'active') {
        await sendEmail({ to: user.email, subject: input.title, text: `${input.message}${input.link ? `\n\n${input.link}` : ''}` });
      }
    }
  } catch (err) {
    logger.error({ err, userId, type: input.type }, 'Notification failed');
  }
}
