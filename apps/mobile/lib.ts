import { Platform } from 'react-native';
import { createClient } from '@lilac/api-client';
export const origin =
  process.env.EXPO_PUBLIC_ASSET_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://127.0.0.1:3000');
export const apiBase =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000/api/v1' : 'http://127.0.0.1:8000/api/v1');
export let authToken: string | null = null;
export const setToken = (value: string | null) => {
  authToken = value;
};
export const api = createClient(apiBase, () => authToken);
export const imageUri = (id: string) =>
  id.startsWith('seed_cutout_')
    ? `${origin}/images/${id}.webp`
    : id.startsWith('seed_')
      ? `${origin}/images/${id}.jpg`
      : `${origin}/media/${id}.webp`;
/**
 * Where to load an image from. A seller's unpublished uploads are private, so those are fetched
 * from the owner endpoint with their session instead of the public address.
 */
export const imageSource = (id: string, priv = false) =>
  priv && !id.startsWith('seed_')
    ? {
        uri: `${apiBase}/assets/${id}`,
        headers: { Authorization: `Bearer ${authToken ?? ''}` },
      }
    : { uri: imageUri(id) };
