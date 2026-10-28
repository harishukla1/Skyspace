import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}
export interface DeliveryResult {
  delivered: boolean;
  provider: string;
  id?: string;
  error?: string;
}

interface EmailProvider {
  send(msg: EmailMessage): Promise<DeliveryResult>;
}

/** Development provider: logs the message. Reports delivered=false so nothing claims a real email was sent. */
const consoleProvider: EmailProvider = {
  async send(msg) {
    logger.info({ to: msg.to, subject: msg.subject, text: msg.text }, '[email:console] message not sent (development provider)');
    devOutbox.push({ ...msg, at: new Date() });
    if (devOutbox.length > 50) devOutbox.shift();
    return { delivered: false, provider: 'console' };
  },
};

function smtpProvider(): EmailProvider {
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  return {
    async send(msg) {
      try {
        const info = await transport.sendMail({ from: env.EMAIL_FROM, ...msg });
        return { delivered: info.accepted.length > 0, provider: 'smtp', id: info.messageId };
      } catch (err) {
        logger.error({ err, to: msg.to }, 'SMTP send failed');
        return { delivered: false, provider: 'smtp', error: (err as Error).message };
      }
    },
  };
}

/** Last messages sent via the console provider — used by tests and the dev seed output. Never populated in production. */
export const devOutbox: (EmailMessage & { at: Date })[] = [];

const provider = env.EMAIL_PROVIDER === 'smtp' ? smtpProvider() : consoleProvider;
export const sendEmail = (msg: EmailMessage) => provider.send(msg);
