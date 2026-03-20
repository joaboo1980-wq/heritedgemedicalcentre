/**
 * Gets the correct redirect URL for authentication callbacks
 * Works across both development and production environments
 */
export const getAuthRedirectUrl = (path: string = '/reset-password'): string => {
  // Use window.location.origin to get the current domain
  // In development: http://localhost:8080
  // In production (Vercel): https://heritedgemedicalcentre.vercel.app
  const origin = window.location.origin;
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${origin}${normalizedPath}`;
};

/**
 * Gets the production redirect URL for email links
 * Always returns the Vercel production domain for password reset emails
 * This ensures emails work on all devices (phone, tablet, etc.)
 */
export const getProductionAuthRedirectUrl = (path: string = '/reset-password'): string => {
  const productionDomain = 'https://heritedgemedicalcentre.vercel.app';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${productionDomain}${normalizedPath}`;
};

/**
 * All redirect URLs that need to be configured in Supabase Auth settings
 * Add these to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs
 */
export const SUPABASE_REDIRECT_URLS = [
  'http://localhost:8080/reset-password',
  'http://localhost:3000/reset-password',
  'https://heritedgemedicalcentre.vercel.app/reset-password',
  'https://heritedgemedicalcentre.vercel.app/auth/callback',
];
