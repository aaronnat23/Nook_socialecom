import { createClient } from '@lilac/api-client';
export const api = createClient('/api/v1', () =>
  typeof window === 'undefined' ? null : localStorage.getItem('lilac-token'),
);
export async function serverApi<T>(path: string): Promise<T> {
  const r = await fetch(`${process.env.API_URL || 'http://127.0.0.1:8000'}/api/v1${path}`, {
    cache: 'no-store',
  });
  if (!r.ok) throw new Error('The Lilac service is unavailable. Please try again.');
  return r.json() as Promise<T>;
}
export const appName = process.env.NEXT_PUBLIC_APP_NAME || 'lilac';
