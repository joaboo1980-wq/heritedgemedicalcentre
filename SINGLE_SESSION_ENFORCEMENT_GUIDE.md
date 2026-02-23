# Single-Session Enforcement Implementation Guide

## Overview
The migration `20260216_create_user_sessions_tracking.sql` now includes **enforcement logic** that will:
- ✅ Allow only 1 active session per user at a time
- ✅ Automatically invalidate old sessions when user logs in from a new device
- ✅ Prevent duplicate records from concurrent logins
- ✅ Track device info and login history for audit purposes

## How It Works

### Database Functions Available

#### 1. `enforce_single_session(user_id, session_token, device_info)`
**Purpose**: Called when user logs in. Invalidates all old sessions and creates a new one.

```sql
-- Example:
SELECT * FROM public.enforce_single_session(
  'user-uuid-here',
  'generated-session-token',
  'Chrome on Windows 10 from IP 192.168.1.100'
);
```

**What it does**:
1. Sets `is_active = false` for ALL existing sessions of this user
2. Creates new session with `is_active = true` and 24-hour expiration
3. Returns new session ID and confirmation message

#### 2. `is_session_valid(user_id, session_token)`
**Purpose**: Validates if a session is still active. Call this on every API request.

```sql
-- Example:
SELECT public.is_session_valid(
  'user-uuid-here',
  'session-token-from-request'
);
-- Returns: true or false
```

**Returns**:
- `true` = Session is active and not expired (allow request)
- `false` = Session is invalid/expired/logged out (reject request, force re-login)

#### 3. `logout_all_sessions(user_id)`
**Purpose**: Force logout user from all devices.

```sql
-- Used when:
-- - Password is changed
-- - Account is locked
-- - Security incident detected
-- - User manually logs out
SELECT public.logout_all_sessions('user-uuid-here');
```

## Integration Steps

### Step 1: Update Your Login/Authentication Flow

**File to modify**: `src/contexts/AuthContext.tsx` or your login handler

```typescript
// When user successfully authenticates with Supabase
const handleLogin = async (email: string, password: string) => {
  try {
    // 1. Standard Supabase login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const user = data.user;
    const authToken = data.session?.access_token;

    // 2. Generate unique session token (use crypto or UUID library)
    const sessionToken = crypto.randomUUID();
    
    // 3. Collect device info (browser, OS, IP if available)
    const deviceInfo = `${navigator.userAgent} from IP ${getClientIP()}`;

    // 4. CRITICAL: Enforce single-session policy
    // This invalidates all old sessions and creates new one
    const { data: sessionResult, error: sessionError } = await supabase
      .rpc('enforce_single_session', {
        p_user_id: user.id,
        p_new_session_token: sessionToken,
        p_device_info: deviceInfo,
      });

    if (sessionError) {
      console.error('Session enforcement failed:', sessionError);
      throw sessionError;
    }

    // 5. Store session token in localStorage
    localStorage.setItem('session_token', sessionToken);
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('login_timestamp', new Date().toISOString());

    // 6. Update auth context
    setUser(user);
    setSessionToken(sessionToken);

    // 7. Redirect to dashboard
    navigate('/dashboard');
  } catch (error) {
    console.error('Login failed:', error);
    toast.error('Login failed: ' + error.message);
  }
};
```

### Step 2: Add Session Validation to API Requests

**Create a request interceptor** that validates session before every request:

```typescript
// src/utils/apiClient.ts or similar
import axios from 'axios'; // if using axios

// Or if using fetch:
const makeAuthenticatedRequest = async (url: string, options = {}) => {
  const sessionToken = localStorage.getItem('session_token');
  const userId = localStorage.getItem('user_id');

  if (!sessionToken || !userId) {
    // No session - redirect to login
    redirectToLogin();
    return;
  }

  // 1. Validate session is still active
  const { data: isValid, error } = await supabase
    .rpc('is_session_valid', {
      p_user_id: userId,
      p_session_token: sessionToken,
    });

  if (error || !isValid) {
    // Session is invalid/expired
    console.warn('Session expired or invalid');
    localStorage.removeItem('session_token');
    localStorage.removeItem('user_id');
    toast.error('Your session has expired. Please log in again.');
    redirectToLogin();
    return;
  }

  // 2. Include session token in request headers
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${sessionToken}`,
    'X-User-ID': userId,
  };

  // 3. Make the actual request
  return fetch(url, {
    ...options,
    headers,
  });
};
```

### Step 3: Handle Session Expiration/Invalidation

**When user is logged out from another device:**

```typescript
// Add this to your useEffect in AuthContext or App.tsx
useEffect(() => {
  // Check session validity every 1 minute
  const intervalId = setInterval(async () => {
    const sessionToken = localStorage.getItem('session_token');
    const userId = localStorage.getItem('user_id');

    if (sessionToken && userId) {
      const { data: isValid } = await supabase.rpc('is_session_valid', {
        p_user_id: userId,
        p_session_token: sessionToken,
      });

      if (!isValid) {
        // Session was invalidated (probably user logged in from another device)
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_id');
        
        toast.warning(
          'Your session has been invalidated. You were logged in from another device. Please log in again.'
        );
        
        redirectToLogin();
      }
    }
  }, 60000); // Check every 60 seconds

  return () => clearInterval(intervalId);
}, []);
```

### Step 4: Update Logout Handler

```typescript
const handleLogout = async () => {
  const userId = localStorage.getItem('user_id');

  // 1. Invalidate all sessions for this user (optional - more secure)
  // if (userId) {
  //   await supabase.rpc('logout_all_sessions', { p_user_id: userId });
  // }

  // OR: Just logout current session (simpler)
  await supabase.auth.signOut();

  // 2. Clear local storage
  localStorage.removeItem('session_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('login_timestamp');

  // 3. Redirect to login
  redirectToLogin();
};
```

## How It Solves Duplicate Records

### Scenario: Without Session Enforcement
```
Tuesday 10:00 AM - John logs in from his Desktop
  → Creates 5 invoices as "created_by: john"
  
Tuesday 10:15 AM - Someone else uses John's password from Laptop
  → Creates 10 more invoices as "created_by: john"
  
RESULT: 15 invoices all attributed to John, can't tell which John actually created
```

### Scenario: With Session Enforcement
```
Tuesday 10:00 AM - John logs in from his Desktop
  → Session created for Desktop
  → Creates 5 invoices as "created_by: john"
  
Tuesday 10:15 AM - Someone logs in with John's password from Laptop
  → Desktop session is IMMEDIATELY INVALIDATED
  → Desktop: User gets popup "Session expired, please log in again"
  → Laptop: New session created for Laptop
  
RESULT: Can audit which device/session created which records
         Prevents duplicate concurrent creation
         Clear accountability trail
```

## Database Schema After Migration

### user_sessions Table
```sql
id                UUID          -- Unique session ID
user_id           UUID          -- Which user this session belongs to
session_token     TEXT          -- Unique token for this session
device_info       TEXT          -- Browser, OS, IP address
is_active         BOOLEAN       -- true = active, false = logged out or replaced
last_activity     TIMESTAMP     -- When user last did something
expires_at        TIMESTAMP     -- When session expires (24 hours from login)
created_at        TIMESTAMP     -- When session was created
```

### Sample Query to See Active Sessions
```sql
-- See all active sessions
SELECT user_id, session_token, device_info, created_at 
FROM public.user_sessions 
WHERE is_active = true AND expires_at > NOW()
ORDER BY created_at DESC;

-- See login history for audit
SELECT user_id, device_info, created_at, expires_at, is_active
FROM public.user_sessions
WHERE user_id = 'some-user-id'
ORDER BY created_at DESC
LIMIT 20;
```

## Testing the Enforcement

### Test Case 1: Single Session
1. User logs in from Device A
   - ✅ Session created, works normally
2. User logs in from Device B with same account
   - ✅ Device A session becomes invalid
   - ✅ Device A user sees "Your session has expired"
   - ✅ Only Device B can access system
3. User logs out from Device B
   - ✅ Session marked as inactive
   - ✅ Cannot submit data without re-login

### Test Case 2: Concurrent Login Prevention
1. Staff member A logs in at 9:00 AM
2. Staff member B tries to use same password at 9:01 AM
   - ✅ Staff member A gets kicked out
   - ✅ Staff member B's session is now active
   - ✅ If both tried to create invoices simultaneously:
     - A's request fails (session invalid)
     - B's request succeeds
     - No duplicate records

### Test Case 3: Session Expiration
1. User logs in at 9:00 AM
2. Session expires at 9:00 AM next day
   - ✅ After expiration, user must re-login
   - ✅ Old session is cleaned up by `cleanup_expired_sessions()`

## Operations & Maintenance

### Daily/Weekly Tasks

**Run session cleanup** (remove expired sessions):
```sql
SELECT public.cleanup_expired_sessions();
```

Or set up a scheduled job in Supabase:
```sql
-- One-time: Create cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run daily at 2 AM
SELECT cron.schedule('cleanup-expired-sessions', '0 2 * * *', 'SELECT public.cleanup_expired_sessions();');
```

### Emergency Operations

**Force logout specific user** (if breached):
```sql
SELECT public.logout_all_sessions('user-uuid-here');
```

**Check who's currently logged in**:
```sql
SELECT user_id, device_info, created_at 
FROM public.user_sessions 
WHERE is_active = true AND expires_at > NOW();
```

## Security Considerations

✅ **Prevents**: Account sharing, concurrent logins, duplicate data from same user  
✅ **Tracks**: Device info, login timestamps for audit trail  
✅ **Enforces**: Single active session per user per device  
✅ **Cleans up**: Automatically removes expired sessions  

⚠️ **Note**: This is application-level session management. Supabase Auth itself is separate.
- Users can still use their Supabase auth token to make direct database calls
- Implement Row-Level Security (RLS) policies as additional protection layer
- Session enforcement adds accountability layer on top of RLS

## Rollback Plan

If something goes wrong:
```sql
-- Disable enforcement (allow multiple sessions again)
UPDATE public.user_sessions SET is_active = true WHERE is_active = false;

-- Or drop the table entirely
DROP TABLE IF EXISTS public.user_sessions CASCADE;
```

Then remove the session token checking from your frontend code.

## Next Steps

1. ✅ Apply migration: `supabase migration up`
2. ✅ Implement login handler (Step 1)
3. ✅ Add session validation to API requests (Step 2)
4. ✅ Add session expiration handling (Step 3)
5. ✅ Update logout handler (Step 4)
6. ✅ Test with multiple devices
7. ✅ Set up `cleanup_expired_sessions()` scheduled job
8. ✅ Monitor audit logs for suspicious patterns
