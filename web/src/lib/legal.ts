const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export type PublicLegalDoc = {
  id: string;
  type: string;
  version: number;
  title: string;
  body_markdown: string;
};

export async function getPublicDocuments(): Promise<PublicLegalDoc[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/legal/public`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.documents ?? [];
  } catch {
    return [];
  }
}

export const DOC_TYPE_TO_SLUG: Record<string, string> = {
  terms_and_conditions: 'terms',
  privacy_notice: 'privacy',
  cookie_policy: 'cookies',
  acceptable_usage_policy: 'usage',
};

export const SLUG_TO_DOC_TYPE: Record<string, string> = {
  terms: 'terms_and_conditions',
  privacy: 'privacy_notice',
  cookies: 'cookie_policy',
  usage: 'acceptable_usage_policy',
};
