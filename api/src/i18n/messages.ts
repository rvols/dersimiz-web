export type ApiLocale = 'tr' | 'en';

const messages: Record<ApiLocale, Record<string, string>> = {
  en: {
    VALIDATION_ERROR: 'Validation error',
    NOT_FOUND: 'Not found',
    FORBIDDEN: 'Access denied',
    INVALID_OTP: 'Invalid or expired verification code',
    EXPIRED_OTP: 'Verification code expired',
    TOO_MANY_ATTEMPTS: 'Too many attempts',
    INVALID_TOKEN: 'Invalid or expired token',
    USER_NOT_FOUND: 'User not found',
    UNAUTHORIZED: 'Invalid email or password',
    PRODUCT_NOT_FOUND: 'Product not found',
    RATE_LIMIT: 'Too many requests',
    INTERNAL_ERROR: 'Internal server error',
    SMS_SEND_FAILED: 'Could not send verification code',
  },
  tr: {
    VALIDATION_ERROR: 'Doğrulama hatası',
    NOT_FOUND: 'Bulunamadı',
    FORBIDDEN: 'Erişim reddedildi',
    INVALID_OTP: 'Geçersiz veya süresi dolmuş doğrulama kodu',
    EXPIRED_OTP: 'Doğrulama kodunun süresi doldu',
    TOO_MANY_ATTEMPTS: 'Çok fazla deneme',
    INVALID_TOKEN: 'Geçersiz veya süresi dolmuş token',
    USER_NOT_FOUND: 'Kullanıcı bulunamadı',
    UNAUTHORIZED: 'E-posta veya şifre hatalı',
    PRODUCT_NOT_FOUND: 'Ürün bulunamadı',
    RATE_LIMIT: 'Çok fazla istek',
    INTERNAL_ERROR: 'Sunucu hatası',
    SMS_SEND_FAILED: 'Doğrulama kodu gönderilemedi',
  },
};

export function getMessage(code: string, locale: ApiLocale): string | undefined {
  return messages[locale]?.[code] ?? messages.en[code];
}

export function getMessageOrFallback(code: string, locale: ApiLocale, fallback: string): string {
  return getMessage(code, locale) ?? fallback;
}
