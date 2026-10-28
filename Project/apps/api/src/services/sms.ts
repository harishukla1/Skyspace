import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { DeliveryResult } from './email';

/**
 * SMS/OTP integration point. Only the console provider is implemented; MSG91/Twilio adapters must be added
 * with real credentials before enabling SMS_PROVIDER in production. Delivery is never reported as successful
 * unless a provider confirms it.
 */
export async function sendSms(to: string, text: string): Promise<DeliveryResult> {
  if (env.SMS_PROVIDER !== 'console') {
    logger.warn({ provider: env.SMS_PROVIDER }, 'SMS provider configured but adapter not implemented; message not sent');
    return { delivered: false, provider: env.SMS_PROVIDER, error: 'adapter_not_implemented' };
  }
  logger.info({ to, text }, '[sms:console] message not sent (development provider)');
  return { delivered: false, provider: 'console' };
}
