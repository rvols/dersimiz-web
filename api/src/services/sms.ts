const VATAN_SMS_OTP_URL = 'https://api.vatansms.net/api/v1/otp';

export function isSmsConfigured(): boolean {
  return !!(
    process.env.VATAN_SMS_API_ID &&
    process.env.VATAN_SMS_API_KEY &&
    process.env.VATAN_SMS_SENDER
  );
}

/**
 * Convert E.164 phone (e.g. +905551234567) to Turkish national format (5551234567)
 * for Vatan SMS API. If not Turkish (+90), passes digits only.
 */
function toVatanPhone(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Send OTP via Vatan SMS API.
 * No-op if SMS is not configured (env vars missing).
 */
export async function sendOtpSms(phoneNumber: string, code: string): Promise<void> {
  const apiId = process.env.VATAN_SMS_API_ID;
  const apiKey = process.env.VATAN_SMS_API_KEY;
  const sender = process.env.VATAN_SMS_SENDER;
  if (!apiId || !apiKey || !sender) {
    return;
  }

  const messageType = process.env.VATAN_SMS_MESSAGE_TYPE || 'normal';
  const template = process.env.VATAN_SMS_MESSAGE_TEMPLATE || 'OTP kodunuz: {code}';
  const message = template.replace('{code}', code);

  const body = {
    api_id: apiId,
    api_key: apiKey,
    sender,
    message_type: messageType,
    message,
    phones: [toVatanPhone(phoneNumber)],
  };

  const res = await fetch(VATAN_SMS_OTP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vatan SMS failed (${res.status}): ${text}`);
  }
}
