import { env } from './env.js';

/** True when a payment provider has been configured (keys present in server env only). */
export function isBillingConfigured() {
  return Boolean(env.razorpayKeyId?.trim() || env.stripeSecretKey?.trim());
}
