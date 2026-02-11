/**
 * Locales used for multilingual content in the admin (lesson names, plan names,
 * locations, school types, etc.). Add a new code here to support another language
 * everywhere without changing page components.
 */
export const CONTENT_LOCALES = ['en', 'tr'] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

/** Empty object with a key for each content locale */
export function emptyLocalized(): Record<string, string> {
  return Object.fromEntries(CONTENT_LOCALES.map((l) => [l, '']));
}

/** Merge entity JSONB (e.g. name or display_name) with defaults for all content locales */
export function localizedFromEntity(
  value: Record<string, string> | null | undefined
): Record<string, string> {
  const base = emptyLocalized();
  if (!value || typeof value !== 'object') return base;
  for (const loc of CONTENT_LOCALES) {
    if (typeof value[loc] === 'string') base[loc] = value[loc];
  }
  return base;
}

/** Get value for a locale from JSONB, or fallback */
export function getLocalizedValue(
  value: Record<string, string> | null | undefined,
  locale: string
): string {
  if (!value || typeof value !== 'object') return '—';
  const v = value[locale];
  return typeof v === 'string' ? v : '—';
}

/** Single-line label for dropdowns (first non-empty locale value) */
export function formatLocalizedOption(
  value: Record<string, string> | null | undefined
): string {
  if (!value || typeof value !== 'object') return '—';
  for (const loc of CONTENT_LOCALES) {
    const v = value[loc];
    if (typeof v === 'string' && v.trim()) return v;
  }
  const fallback = Object.values(value).find((v) => typeof v === 'string' && v.trim());
  return typeof fallback === 'string' ? fallback : '—';
}
