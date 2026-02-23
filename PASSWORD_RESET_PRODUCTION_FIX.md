# Password Reset Configuration for Production (Vercel)

## Problem
When deploying to Vercel, password reset links in emails were redirecting to `localhost:8080` instead of your Vercel production domain, causing connection errors.

## Solution Implemented

### 1. Utility Function Created
- **File**: `src/utils/authRedirectUrl.ts`
- Centralizes redirect URL generation for all auth flows
- Automatically uses the correct domain (`window.location.origin`)

### 2. Code Updated
- **ForgotPassword.tsx**: Uses `getAuthRedirectUrl()` for password resets
- **UserManagement.tsx**: Uses `getAuthRedirectUrl()` for admin-created user resets
- Both files now have consistent redirect URL handling

### 3. Environment Configuration
- **File**: `.env.production` created
- Ensures Supabase credentials are properly configured for production

## Required: Supabase Configuration

You MUST configure your redirect URLs in Supabase for this to work in production:

### Steps:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `krhpwnjcwmwpocfkthog`
3. Navigate to: **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add:
   ```
   http://localhost:8080/reset-password
   http://localhost:3000/reset-password
   https://your-vercel-domain.vercel.app/reset-password
   https://your-vercel-domain.vercel.app/auth/callback
   ```
   (Replace `your-vercel-domain` with your actual Vercel deployment URL)

5. Click **Save**

## How It Works

When a user requests a password reset:
1. Frontend calls `resetPasswordForEmail()` with redirect URL
2. Redirect URL is generated using `getAuthRedirectUrl()` which returns `window.location.origin/reset-password`
3. In development: `http://localhost:8080/reset-password`
4. In production (Vercel): `https://your-app.vercel.app/reset-password`
5. Supabase validates the redirect URL against the configured list
6. Email is sent with the correct link
7. User clicks link and is redirected to the correct domain

## Testing

- **Local Development**: Ensure port 8080 is in Supabase redirect URLs
- **Vercel Production**: After pushing to git and updating, test password reset with your actual Vercel domain in Supabase settings
- **Check Email**: Verify the link in the password reset email contains your correct domain

## Future Enhancements

If you add other auth flows (magic links, SSO, etc.), use the same `getAuthRedirectUrl()` utility to maintain consistency.
