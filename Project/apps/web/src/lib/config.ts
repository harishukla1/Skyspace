export const SITE_NAME = 'Sky Space Realty';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
/** Server-side base URL (may be an internal network address). */
export const SERVER_API = process.env.API_INTERNAL_URL ?? PUBLIC_API;
export const MAPS_PROVIDER = (process.env.NEXT_PUBLIC_MAPS_PROVIDER ?? 'none') as 'none' | 'google' | 'mapbox';
export const MAPS_KEY = process.env.NEXT_PUBLIC_MAPS_API_KEY ?? '';
